#!/usr/bin/env python3
import os, subprocess, shutil
KIT = os.environ.get("KIT", os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")))
W = os.path.dirname(os.path.abspath(__file__)) + "/failhash"
if os.path.exists(W): shutil.rmtree(W)
os.makedirs(W + "/repo/.devloop"); shutil.copytree(KIT + "/.claude", W + "/repo/.claude")
subprocess.run("git init -q", shell=True, cwd=W + "/repo")

A = "tests/test_calc.py::test_add"; B = "tests/test_calc.py::test_div[3-0]"; C = "step:typecheck"
def rep(body, pre="", post="\n## Failures\n### F1 x\n"):
    return f"---\nARTIFACT: test-report\n---\n# Test Report\n{pre}\n## Failing IDs\n{body}\n{post}"

REF = rep(f"- {A}\n- {B}\n- {C}")
# (id, label SAME/DIFF relative to REF (or to `other`), content(s))
CASES = [
 ("S01", "SAME", rep(f"- {C}\n- {A}\n- {B}"), "shuffled order"),
 ("S02", "SAME", rep(f"* {A}\n* {B}\n* {C}"), "* bullets"),
 ("S03", "SAME", rep(f"- `{A}`\n- `{B}`\n- `{C}`"), "backticked"),
 ("S04", "SAME", rep(f"- {A}   \n- {B}\t\n- {C}"), "trailing whitespace"),
 ("S05", "SAME", rep(f"- {A}\n- {B}\n- {C}").replace("\n", "\r\n"), "CRLF line endings"),
 ("S06", "SAME", rep(f"- {A}\n- {A}\n- {B}\n- {C}"), "duplicate id"),
 ("S07", "SAME", rep(f"<!-- one per line -->\n- {A}\n\n- {B}\n- {C}"), "HTML comment + blank line"),
 ("S08", "SAME", rep(f"  - {A}\n  - {B}\n  - {C}"), "indented bullets"),
 ("S09", "SAME", rep(f"{A}\n{B}\n{C}"), "no bullets"),
 ("S10", "SAME", rep(f"1. {A}\n2. {B}\n3. {C}"), "numbered list"),
 ("S11", "SAME", rep(f"- {A} - assert 4 == 5\n- {B}\n- {C}"), "id followed by a reason"),
 ("S12", "SAME", rep(f"- **{A}**\n- {B}\n- {C}"), "bold markup"),
 ("S13", "SAME", rep(f"- {A}\n- {B}\n- {C}", post="\n### notes\nsee below\n## Failures\n"), "### sub-heading inside section"),
 ("S14", "SAME", rep(f"-   {A}\n-\t{B}\n- {C}"), "extra spaces/tab after dash"),
 ("S15", "SAME", rep(f"- ` {A} `\n- {B}\n- {C}"), "backticks with inner spaces"),
 ("D01", "DIFF", rep(f"- {A}\n- {B}"), "subset"),
 ("D02", "DIFF", rep(f"- {A}\n- tests/test_calc.py::test_div[4-0]\n- {C}"), "param id changed"),
 ("D03", "DIFF", rep("none"), "none vs set"),
 ("D04", "DIFF", rep(f"- {A}\n- {B}\n- {C}\n- step:lint"), "superset"),
 ("D05", "DIFF", rep(f"- {A.upper()}\n- {B}\n- {C}"), "case differs"),
 ("D06", "DIFF", rep(f"- {A}\n- {B}\n- step:build"), "step changed"),
]
NONE_CASES = [("N01", rep("none")), ("N02", rep("- none")), ("N03", rep("")), ("N04", rep("None")), ("N05", rep("- None")), ("N06", rep("n/a")), ("N07", rep("<!-- none -->\n{{id}}"))]

def fh(*contents):
    paths = []
    for i, c in enumerate(contents):
        p = f"{W}/r{len(os.listdir(W))}_{i}.md"; open(p, "w", newline="").write(c); paths.append(p)
    r = subprocess.run(["bash", W + "/repo/.claude/hooks/devloop-run.sh", "failhash", *paths], cwd=W + "/repo", env=dict(os.environ, CLAUDE_PROJECT_DIR=W + "/repo"), capture_output=True, text=True)
    return r.stdout.strip() or ("ERR:" + r.stderr.strip())

ref = fh(REF); print("REF", ref)
ok = 0; total = 0
for cid, lab, c, d in CASES:
    h = fh(c); same = h == ref; good = same == (lab == "SAME"); ok += good; total += 1
    print(cid, lab, h, "OK" if good else "MISS", d)
# split across two files (test-report + browser-report) == combined
h2 = fh(rep(f"- {A}\n- {B}"), rep(f"- {C}\n- {A}")); g = h2 == ref; ok += g; total += 1
print("S16 SAME", h2, "OK" if g else "MISS", "split over test-report + browser-report with overlap")
for cid, c in NONE_CASES:
    h = fh(c); g = h == "none"; ok += g; total += 1; print(cid, "NONE", h, "OK" if g else "MISS", repr(c.split("## Failing IDs\n")[1].split("\n")[0]))
h = fh(rep("x").replace("## Failing IDs", "## Failing IDs (3)")); print("E01 heading variant ->", h)
print(f"\n{ok}/{total} correct")
