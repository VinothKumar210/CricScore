#!/usr/bin/env python3
import subprocess
import sys
from datetime import datetime, timedelta
import os

def get_commit_count():
    """Get the total number of commits in the repository."""
    try:
        result = subprocess.run(
            ['git', 'rev-list', '--count', 'HEAD'],
            capture_output=True,
            text=True,
            check=True
        )
        return int(result.stdout.strip())
    except subprocess.CalledProcessError as e:
        print(f"Error getting commit count: {e}")
        sys.exit(1)

def get_all_commits():
    """Get all commits with their details."""
    try:
        result = subprocess.run(
            ['git', 'log', '--format=%H|%an|%ae|%s|%b', '--reverse'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            check=True
        )
        commits = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('|', 4)
                if len(parts) >= 4:
                    commits.append({
                        'hash': parts[0],
                        'author_name': parts[1],
                        'author_email': parts[2],
                        'subject': parts[3],
                        'body': parts[4] if len(parts) > 4 else ''
                    })
        return commits
    except subprocess.CalledProcessError as e:
        print(f"Error getting commits: {e}")
        sys.exit(1)

def calculate_dates(total_commits, commits_per_day=5):
    """Calculate the date for each commit, working backwards from today."""
    today = datetime.now()
    total_days = (total_commits + commits_per_day - 1) // commits_per_day
    start_date = today - timedelta(days=total_days - 1)
    
    dates = []
    current_date = start_date
    commits_today = 0
    
    for i in range(total_commits):
        # Add time variation throughout the day (9 AM to 6 PM)
        hour = 9 + (commits_today * 2)
        minute = (commits_today * 13) % 60
        
        commit_datetime = current_date.replace(hour=hour, minute=minute, second=0)
        dates.append(commit_datetime)
        
        commits_today += 1
        if commits_today >= commits_per_day:
            current_date += timedelta(days=1)
            commits_today = 0
    
    return dates

def rewrite_history(commits, dates):
    """Rewrite Git history with new dates."""
    if len(commits) != len(dates):
        print("Error: Number of commits and dates don't match")
        sys.exit(1)
    
    print(f"\nThis will rewrite {len(commits)} commits with new dates.")
    print(f"First commit will be dated: {dates[0]}")
    print(f"Last commit will be dated: {dates[-1]}")
    print("\nWARNING: This will rewrite Git history. Make sure you have a backup!")
    
    response = input("\nDo you want to continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Aborted.")
        sys.exit(0)
    
    # Create a backup branch
    print("\nCreating backup branch 'backup-before-rewrite'...")
    subprocess.run(['git', 'branch', '-D', 'backup-before-rewrite'], 
                  capture_output=True, check=False)
    subprocess.run(['git', 'branch', 'backup-before-rewrite'], check=False)
    
    # Get current branch
    current_branch = subprocess.run(
        ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
        capture_output=True,
        text=True,
        check=True
    ).stdout.strip()
    
    temp_branch = 'temp-rewrite-branch'
    
    try:
        # Delete temp branch if exists
        subprocess.run(['git', 'branch', '-D', temp_branch], 
                      capture_output=True, check=False)
        
        # Create orphan branch
        print("\nCreating new history...")
        subprocess.run(['git', 'checkout', '--orphan', temp_branch], 
                      check=True, capture_output=True)
        
        subprocess.run(['git', 'rm', '-rf', '.'], 
                      capture_output=True, check=False)
        
        # Replay each commit with new dates
        for i, (commit, new_date) in enumerate(zip(commits, dates)):
            print(f"\rProcessing commit {i+1}/{len(commits)}...", end='', flush=True)
            
            # Checkout files from original commit
            subprocess.run(
                ['git', 'checkout', commit['hash'], '--', '.'],
                capture_output=True,
                check=True
            )
            
            subprocess.run(['git', 'add', '-A'], check=True, capture_output=True)
            
            # Format date for Git
            date_str = new_date.strftime('%Y-%m-%d %H:%M:%S')
            
            # Create commit with new date
            env = os.environ.copy()
            env['GIT_AUTHOR_NAME'] = commit['author_name']
            env['GIT_AUTHOR_EMAIL'] = commit['author_email']
            env['GIT_AUTHOR_DATE'] = date_str
            env['GIT_COMMITTER_NAME'] = commit['author_name']
            env['GIT_COMMITTER_EMAIL'] = commit['author_email']
            env['GIT_COMMITTER_DATE'] = date_str
            
            commit_message = commit['subject']
            if commit['body']:
                commit_message += '\n\n' + commit['body']
            
            # Use --allow-empty to handle commits that might not have file changes
            result = subprocess.run(
                ['git', 'commit', '--allow-empty', '-m', commit_message],
                env=env,
                capture_output=True,
                check=False
            )
            
            # If commit still fails, try with a default message
            if result.returncode != 0:
                print(f"\nWarning: Commit {i+1} failed, retrying with simplified message...")
                subprocess.run(
                    ['git', 'commit', '--allow-empty', '-m', f'Commit {i+1}'],
                    env=env,
                    capture_output=True,
                    check=True
                )
        
        print("\n\nReplacing old branch with new history...")
        
        subprocess.run(['git', 'checkout', temp_branch], check=True, capture_output=True)
        subprocess.run(['git', 'branch', '-D', current_branch], check=True, capture_output=True)
        subprocess.run(['git', 'branch', '-m', current_branch], check=True, capture_output=True)
        
        print("\n✓ Git history has been rewritten successfully!")
        print(f"\nOriginal history is saved in branch 'backup-before-rewrite'")
        print("\nTo push the new history to remote (if needed):")
        print("  git push --force origin " + current_branch)
        print("\nTo restore the original history if needed:")
        print("  git reset --hard backup-before-rewrite")
        
    except subprocess.CalledProcessError as e:
        print(f"\n\nError during rewrite: {e}")
        print("Attempting to restore original state...")
        subprocess.run(['git', 'checkout', current_branch], check=False)
        subprocess.run(['git', 'branch', '-D', temp_branch], check=False)
        sys.exit(1)

def main():
    # Check if in git repository
    try:
        subprocess.run(['git', 'rev-parse', '--git-dir'], 
                      capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print("Error: Not a git repository")
        sys.exit(1)
    
    print("Git History Rewriter")
    print("=" * 50)
    
    print("\nAnalyzing repository...")
    total_commits = get_commit_count()
    print(f"Total commits: {total_commits}")
    
    commits_per_day = 5
    total_days = (total_commits + commits_per_day - 1) // commits_per_day
    print(f"Commits per day: {commits_per_day}")
    print(f"Total days needed: {total_days}")
    
    print("\nFetching commit details...")
    commits = get_all_commits()
    
    if len(commits) != total_commits:
        print(f"Warning: Expected {total_commits} commits but got {len(commits)}")
    
    print("\nCalculating new dates...")
    dates = calculate_dates(len(commits), commits_per_day)
    
    rewrite_history(commits, dates)

if __name__ == '__main__':
    main()
