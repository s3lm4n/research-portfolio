import re
import os

files_to_update = ['index.html', 'macs-project.html']

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove Tailwind CDN script
    content = re.sub(r'<script src="https://cdn\.tailwindcss\.com"></script>\s*', '', content)
    
    # Remove inline tailwind config
    content = re.sub(r'<!-- Tailwind Config for Design System -->\s*<script>\s*tailwind\.config\s*=\s*\{.*?\};\s*</script>\s*', '', content, flags=re.DOTALL)
    
    # Remove inline style tags (we migrated them to input.css)
    content = re.sub(r'<style>.*?</style>\s*', '', content, flags=re.DOTALL)
    
    # Add local CSS link before </head> if not exists
    if '<link href="assets/css/style.css" rel="stylesheet">' not in content:
        content = content.replace('</head>', '    <link href="assets/css/style.css" rel="stylesheet">\n</head>')

    with open(filepath, 'w') as f:
        f.write(content)
        
print("Migration completed! CDN and inline styles removed, local CSS linked.")
