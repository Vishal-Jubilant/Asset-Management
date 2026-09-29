import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Safe trimming
    content = content.replace("user?.name?.toLowerCase().trim()", "user?.name?.toLowerCase()?.trim()")
    content = content.replace("currentUser?.name?.toLowerCase().trim()", "currentUser?.name?.toLowerCase()?.trim()")
    content = content.replace("nameStr.toLowerCase().trim()", "nameStr?.toLowerCase()?.trim()")
    content = content.replace("name.toLowerCase().trim()", "name?.toLowerCase()?.trim()")
    content = content.replace("user.name.toLowerCase().trim()", "user?.name?.toLowerCase()?.trim()")
    
    # Safe property access for filtering
    content = content.replace("r.id.toLowerCase()", "r?.id?.toString()?.toLowerCase()")
    content = content.replace("r.item.toLowerCase()", "r?.item?.toLowerCase()")
    content = content.replace("r.category.toLowerCase()", "r?.category?.toLowerCase()")
    content = content.replace("r.status.toLowerCase()", "r?.status?.toLowerCase()")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r"c:\Users\Vishal N\Downloads\proooo\frontend\src"
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".jsx"):
            replace_in_file(os.path.join(root, file))

print("Replacements complete!")
