import os
import shutil

for item in os.listdir('.'):
    if item in ['.git', '.orchids', 'cleanup.py']:
        continue
    try:
        if os.path.isfile(item) or os.path.islink(item):
            os.unlink(item)
        elif os.path.isdir(item):
            shutil.rmtree(item)
    except Exception as e:
        print(f"Failed to delete {item}: {e}")
