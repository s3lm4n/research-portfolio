import os
import re

files = [
    "index.html",
    "macs-project.html",
    "macs-evidence-summary.html",
    "macs-evidence-matrix.html",
    "macs-decision-log.html",
    "macs-mdp-consistency.html",
    "tr/index.html",
    "tr/macs-project.html",
    "tr/macs-evidence-summary.html",
    "tr/macs-evidence-matrix.html",
    "tr/macs-decision-log.html",
    "tr/macs-mdp-consistency.html"
]

base_dir = "/home/selman/portfolio_website-lab"
results = {"pass": [], "critical": [], "important": [], "minor": []}

def add_issue(level, file, line_num, desc, recommended):
    results[level].append({
        "file": file,
        "line": line_num,
        "desc": desc,
        "recommended": recommended
    })

# Check root files
for root_file in ["sitemap.xml", "robots.txt", "404.html"]:
    if not os.path.exists(os.path.join(base_dir, root_file)):
        add_issue("important", "Root Directory", "N/A", f"Missing {root_file}", f"Create a basic {root_file} for SEO and error handling")

for rel_path in files:
    full_path = os.path.join(base_dir, rel_path)
    if not os.path.exists(full_path):
        add_issue("critical", rel_path, "N/A", "File not found", "Create file")
        continue

    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
        lines = content.splitlines()
    
    # 1. SEO & Head Checks
    if "<title>" not in content:
        add_issue("important", rel_path, "N/A", "Missing <title> tag", "Add <title> tag")
    
    if 'meta name="description"' not in content:
        add_issue("important", rel_path, "N/A", "Missing meta description", "Add <meta name=\"description\" content=\"...\">")
    
    if "canonical" not in content:
        add_issue("minor", rel_path, "N/A", "Missing canonical link", "Add <link rel=\"canonical\" href=\"...\"> when production domain is known")
        
    if "og:title" not in content:
        add_issue("minor", rel_path, "N/A", "Missing Open Graph metadata", "Add basic OG tags (og:title, og:type, og:url, og:image)")

    # Language check
    if rel_path.startswith("tr/"):
        if '<html lang="tr"' not in content:
            add_issue("critical", rel_path, "N/A", "Incorrect or missing html lang for TR page", "Set <html lang=\"tr\">")
    else:
        if '<html lang="en"' not in content:
            add_issue("critical", rel_path, "N/A", "Incorrect or missing html lang for EN page", "Set <html lang=\"en\">")
            
    # Hreflang check
    if "hreflang=\"en\"" not in content or "hreflang=\"tr\"" not in content or "hreflang=\"x-default\"" not in content:
        add_issue("important", rel_path, "N/A", "Missing one or more hreflang tags (en, tr, x-default)", "Ensure all three hreflang variants are present")

    # EN / TR Selector Check
    expected_en = "/" + rel_path.replace("tr/", "") if rel_path.startswith("tr/") else "/" + rel_path
    expected_tr = "/tr/" + rel_path if not rel_path.startswith("tr/") else "/" + rel_path
    expected_en = expected_en.replace("//", "/")
    expected_tr = expected_tr.replace("//", "/")
    
    # Very basic check for these links in the HTML
    if expected_en not in content and rel_path.startswith("tr/"):
        add_issue("critical", rel_path, "N/A", f"EN selector does not seem to point to {expected_en}", f"Fix EN link to point to {expected_en}")
    if expected_tr not in content and not rel_path.startswith("tr/"):
        add_issue("critical", rel_path, "N/A", f"TR selector does not seem to point to {expected_tr}", f"Fix TR link to point to {expected_tr}")

    # Check for empty hrefs / href="#"
    for i, line in enumerate(lines):
        if 'href="#"' in line and not "lightbox-close" in line:
            add_issue("important", rel_path, i+1, "Contains href=\"#\" (potential dead link / bad practice)", "Replace with actual URL or use button for JS actions")
            
        # Missing Assets (quick local check for /assets/...)
        assets = re.findall(r'(?:href|src|poster)="(/assets/[^"]+)"', line)
        for asset in assets:
            asset_path = os.path.join(base_dir, asset.lstrip("/"))
            if not os.path.exists(asset_path):
                add_issue("important", rel_path, i+1, f"Missing asset: {asset}", "Upload asset or fix path")

        if 'class="' in line:
            # Layout checks (specifically Research Snapshot in macs-project.html)
            if rel_path.endswith("macs-project.html") and "<aside" in line and "w-full" in line:
                if "block lg:hidden" in line or "xl:block" in line:
                    add_issue("critical", rel_path, i+1, "Research Snapshot aside has disappearing classes (block lg:hidden xl:block)", "Ensure aside classes are 'w-full xl:w-64 shrink-0 mt-12 xl:mt-0 xl:sticky xl:top-24 xl:self-start' and its parent uses 'lg:flex-wrap xl:flex-nowrap'")

print(f"CRITICAL: {len(results['critical'])}")
for r in results['critical']: print(f"  {r['file']}:{r['line']} - {r['desc']} -> {r['recommended']}")
print(f"\nIMPORTANT: {len(results['important'])}")
for r in results['important']: print(f"  {r['file']}:{r['line']} - {r['desc']} -> {r['recommended']}")
print(f"\nMINOR: {len(results['minor'])}")
for r in results['minor']: print(f"  {r['file']}:{r['line']} - {r['desc']} -> {r['recommended']}")
