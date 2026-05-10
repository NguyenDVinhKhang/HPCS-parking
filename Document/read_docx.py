import zipfile
import xml.etree.ElementTree as ET
import os

WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
TEXT = WORD_NAMESPACE + 't'

def get_docx_text(path):
    try:
        document = zipfile.ZipFile(path)
        xml_content = document.read('word/document.xml')
        document.close()
        tree = ET.XML(xml_content)
        
        paragraphs = []
        for paragraph in tree.iter(WORD_NAMESPACE + 'p'):
            texts = [node.text for node in paragraph.iter(TEXT) if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        
        return '\n'.join(paragraphs)
    except Exception as e:
        return f"Error reading {path}: {str(e)}"

docs = [
    r"C1SE.08_ProductBacklog_HPCS_ver1.0.docx",
    r"C1SE.82_UserStory_HPCS_ver1.0.docx",
    r"Các bước triển khai HPCS.docx",
    r"Chia task theo backlog.docx",
    r"Tổng việc code.docx"
]

with open('output_utf8.txt', 'w', encoding='utf-8') as f:
    for doc in docs:
        full_path = os.path.join(r"e:\Capstone 1\HPCS\Document", doc)
        f.write(f"\n{'='*80}\nReading: {doc}\n{'='*80}\n")
        f.write(get_docx_text(full_path))
        f.write("\n")
