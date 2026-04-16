import os
import re

directory = r'c:\Users\rovhi\Desktop\InvenSight\src\components\pages'

replacements = [
    (r'text-gray-900', 'text-foreground'),
    (r'text-gray-600', 'text-muted-foreground'),
    (r'text-gray-500', 'text-muted-foreground'),
    (r'text-gray-400', 'text-muted-foreground/70'),
    (r'bg-white(?!"| )', 'bg-card'), # Replace bg-white but be careful with strings
    (r'bg-white ', 'bg-card '),
    (r'bg-white"', 'bg-card"'),
    (r'bg-gray-50(?!"| )', 'bg-muted/50'),
    (r'bg-gray-50 ', 'bg-muted/50 '),
    (r'bg-gray-50"', 'bg-muted/50"'),
    (r'border-gray-100', 'border-border'),
    (r'border-gray-200', 'border-border'),
    (r'border-gray-300', 'border-border'),
    (r'divide-gray-100', 'divide-border'),
    (r'divide-gray-200', 'divide-border'),
    (r'dark:text-white', 'text-foreground'), # Cleanup redundant dark:text-white since text-foreground handles it
    (r'dark:bg-gray-800', 'bg-card'), # Cleanup redundant dark:bg-gray-800 since bg-card handles it
    (r'dark:border-gray-700', 'border-border'),
]

for filename in os.listdir(directory):
    if filename.endswith('.tsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content
        for pattern, replacement in replacements:
            new_content = re.sub(pattern, replacement, new_content)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filename}")
