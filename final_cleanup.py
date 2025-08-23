#!/usr/bin/env python3
import subprocess
import sys
from datetime import datetime, timedelta
import os
import re

def get_commits():
    result = subprocess.run(['git', 'log', '--format=%H|%s|%b', '--reverse'], capture_output=True, text=True, encoding='utf-8', errors='replace', check=True)
    commits = []
    for line in result.stdout.strip().split('\n'):
        if line:
            parts = line.split('|', 2)
            if len(parts) >= 2:
                commits.append({'hash': parts[0], 'subject': parts[1], 'body': parts[2] if len(parts) > 2 else ''})
    return commits

def clean_msg(subject, body):
    body_lines = [l for l in (body.split('\n') if body else []) if l.strip() and not any(p in l.lower() for p in ['replit', 'agent', 'ai', 'automated'])]
    cleaned_body = '\n'.join(body_lines).strip()
    cleaned_subject = ' '.join(re.sub(r'(replit|agent)', '', subject, flags=re.IGNORECASE).split())
    return cleaned_subject, cleaned_body

def calc_dates(total, per_day=5):
    today = datetime.now()
    days = (total + per_day - 1) // per_day
    start = today - timedelta(days=days - 1)
    dates = []
    current = start
    count = 0
    for i in range(total):
        hour = 9 + (count * 2)
        minute = (count * 13) % 60
        dates.append(current.replace(hour=hour, minute=minute, second=0))
        count += 1
        if count >= per_day:
            current += timedelta(days=1)
            count = 0
    return dates

def rewrite(commits, dates, name, email):
    print(f'\nRewriting {len(commits)} commits as {name} <{email}>')
    print(f'Date range: {dates[0]} to {dates[-1]}')
    if input('\nContinue? (yes/no): ').lower() != 'yes':
        sys.exit(0)
    
    subprocess.run(['git', 'branch', '-D', 'backup-original'], capture_output=True, check=False)
    subprocess.run(['git', 'branch', 'backup-original'], check=False)
    branch = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    temp = 'temp-final'
    
    try:
        subprocess.run(['git', 'branch', '-D', temp], capture_output=True, check=False)
        subprocess.run(['git', 'checkout', '--orphan', temp], check=True, capture_output=True)
        subprocess.run(['git', 'rm', '-rf', '.'], capture_output=True, check=False)
        
        for i, (c, d) in enumerate(zip(commits, dates)):
            print(f'\r{i+1}/{len(commits)}...', end='', flush=True)
            subprocess.run(['git', 'checkout', c['hash'], '--', '.'], capture_output=True, check=True)
            subprocess.run(['git', 'add', '-A'], check=True, capture_output=True)
            subj, body = clean_msg(c['subject'], c['body'])
            msg = subj + ('\n\n' + body if body else '')
            env = os.environ.copy()
            env.update({'GIT_AUTHOR_NAME': name, 'GIT_AUTHOR_EMAIL': email, 'GIT_AUTHOR_DATE': d.strftime('%Y-%m-%d %H:%M:%S'), 'GIT_COMMITTER_NAME': name, 'GIT_COMMITTER_EMAIL': email, 'GIT_COMMITTER_DATE': d.strftime('%Y-%m-%d %H:%M:%S')})
            subprocess.run(['git', 'commit', '--allow-empty', '-m', msg or 'Update'], env=env, capture_output=True, check=True)
        
        print(f'\n\nDone!')
        subprocess.run(['git', 'checkout', temp], check=True, capture_output=True)
        subprocess.run(['git', 'branch', '-D', branch], check=True, capture_output=True)
        subprocess.run(['git', 'branch', '-m', branch], check=True, capture_output=True)
        print(f'\nAll commits now by {name} <{email}>')
        print(f'Push with: git push --force origin {branch}')
    except Exception as e:
        print(f'\nError: {e}')
        subprocess.run(['git', 'checkout', branch], check=False)
        sys.exit(1)

commits = get_commits()
dates = calc_dates(len(commits))
rewrite(commits, dates, 'Vinothkumar', 'vinothkumarvk6669@gmail.com')
