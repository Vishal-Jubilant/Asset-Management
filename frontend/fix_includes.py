import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Safe includes
    content = content.replace("r.status.includes(", "r.status?.includes(")
    content = content.replace("r.category.includes(", "r.category?.includes(")
    content = content.replace("r.item.includes(", "r.item?.includes(")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r"c:\Users\Vishal N\Downloads\proooo\frontend\src"
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".jsx"):
            replace_in_file(os.path.join(root, file))

print("Includes check added!")
