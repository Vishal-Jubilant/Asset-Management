import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix r.forwardedTo
    content = content.replace("r.forwardedTo.some(n => {", "(Array.isArray(r.forwardedTo) ? r.forwardedTo : [r.forwardedTo]).some(n => {")
    
    # Fix req.forwardedTo
    content = content.replace("req.forwardedTo.some(n => {", "(Array.isArray(req.forwardedTo) ? req.forwardedTo : [req.forwardedTo]).some(n => {")
    
    # Fix request.forwardedTo
    content = content.replace("request.forwardedTo.some(n => {", "(Array.isArray(request.forwardedTo) ? request.forwardedTo : [request.forwardedTo]).some(n => {")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r"c:\Users\Vishal N\Downloads\proooo\frontend\src"
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".jsx"):
            replace_in_file(os.path.join(root, file))

print("ForwardedTo array check added!")
