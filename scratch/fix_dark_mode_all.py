import os
import re

root_directory = r'c:\Users\rovhi\Desktop\InvenSight\src\components'

replacements = [
    (r'text-gray-900', 'text-foreground'),
    (r'text-gray-800', 'text-foreground'),
    (r'text-gray-700', 'text-muted-foreground'),
    (r'text-gray-600', 'text-muted-foreground'),
    (r'text-gray-500', 'text-muted-foreground'),
    (r'text-gray-400', 'text-muted-foreground/70'),
    (r'bg-white(?!"| )', 'bg-card'),
    (r'bg-white ', 'bg-card '),
    (r'bg-white"', 'bg-card"'),
    (r'bg-gray-50(?!"| )', 'bg-muted/50'),
    (r'bg-gray-50 ', 'bg-muted/50 '),
    (r'bg-gray-50"', 'bg-muted/50"'),
    (r'bg-gray-100', 'bg-muted'),
    (r'border-gray-100', 'border-border'),
    (r'border-gray-200', 'border-border'),
    (r'border-gray-300', 'border-border'),
    (r'divide-gray-100', 'divide-border'),
    (r'divide-gray-200', 'divide-border'),
    (r'dark:text-white', 'text-foreground'),
    (r'dark:bg-gray-800', 'bg-card'),
    (r'dark:bg-gray-900', 'bg-background'),
    (r'dark:border-gray-700', 'border-border'),
    (r'blue-600', 'primary'),
    (r'blue-500', 'primary'),
    (r'blue-700', 'primary/90'),
    (r'blue-50', 'primary/10'),
]

for root, dirs, files in os.walk(root_directory):
    for filename in files:
        if filename.endswith('.tsx'):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pattern, replacement in replacements:
                new_content = re.sub(pattern, replacement, new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {os.path.relpath(filepath, root_directory)}")
