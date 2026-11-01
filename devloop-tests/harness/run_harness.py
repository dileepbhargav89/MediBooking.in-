#!/usr/bin/env python3
"""devloop-run.sh TESTS_RAN / NO_TESTS_RAN / LOAD_ERROR accuracy on synthesized runner outputs."""
import os, shutil, subprocess, json, re

KIT = os.environ.get("KIT", os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")))
W = os.path.dirname(os.path.abspath(__file__)) + "/run"
D = W + "/repo"; FX = W + "/fixtures"

# (id, runner, rc, output, truth_ran: pos|zero, truth_load_error)
C = [
 ("py-pass", "pytest", 0, "============================= test session starts ==============================\ncollected 5 items\n\ntests/test_calc.py .....                                                 [100%]\n\n============================== 5 passed in 0.12s ===============================", "pos", False),
 ("py-fail", "pytest", 1, "tests/test_calc.py ..F..\n=================================== FAILURES ===================================\n___ test_add ___\n    def test_add():\n>       assert add(2, 2) == 5\nE       assert 4 == 5\n=========================== short test summary info ============================\nFAILED tests/test_calc.py::test_add - assert 4 == 5\n========================= 1 failed, 4 passed in 0.20s ==========================", "pos", False),
 ("py-q-pass", "pytest -q", 0, ".....                                                                    [100%]\n5 passed in 0.05s", "pos", False),
 ("py-zero", "pytest", 5, "============================= test session starts ==============================\ncollected 0 items\n\n============================ no tests ran in 0.01s =============================", "zero", False),
 ("py-import-err", "pytest", 2, "collected 0 items / 1 error\n\n==================================== ERRORS ====================================\n____________________ ERROR collecting tests/test_calc.py _____________________\nImportError while importing test module '/x/tests/test_calc.py'.\nE   ModuleNotFoundError: No module named 'src.calcc'\n=========================== short test summary info ============================\nERROR tests/test_calc.py\n!!!!!!!!!!!!!!!!!!!! Interrupted: 1 error during collection !!!!!!!!!!!!!!!!!!!!\n=============================== 1 error in 0.10s ===============================", "zero", True),
 ("py-syntax-err", "pytest", 2, "____ ERROR collecting tests/test_calc.py ____\nE     File \"/x/src/calc.py\", line 2\nE       return a +\nE                 ^\nE   SyntaxError: invalid syntax\n!!!! Interrupted: 1 error during collection !!!!\n==== 1 error in 0.08s ====", "zero", True),
 ("py-all-skipped", "pytest", 0, "collected 3 items\n\ntests/test_calc.py sss                                                   [100%]\n\n============================== 3 skipped in 0.01s ==============================", "zero", False),
 ("py-all-deselected", "pytest -k nomatch", 5, "collected 5 items / 5 deselected / 0 selected\n\n============================ 5 deselected in 0.01s =============================", "zero", False),
 ("py-runtime-importerror-fail", "pytest", 1, "FAILED tests/test_opt.py::test_optional_dep - ImportError: yaml is required for export\n========================= 1 failed, 4 passed in 0.20s ==========================", "pos", False),
 ("py-fixture-error", "pytest", 1, "ERROR tests/test_db.py::test_q - ConnectionRefusedError: [Errno 111]\n==================== 4 passed, 1 error in 0.30s ====================", "pos", False),
 ("jest-pass", "jest", 0, "PASS web/__tests__/sum.test.js\n  sum\n    ✓ adds (2 ms)\n\nTest Suites: 2 passed, 2 total\nTests:       10 passed, 10 total\nSnapshots:   1 passed, 1 total\nTime:        0.5 s\nRan all test suites.", "pos", False),
 ("jest-fail", "jest", 1, "FAIL web/__tests__/sum.test.js\n  ● sum › adds\n    expect(received).toBe(expected)\n    Expected: 4\n    Received: 3\n\nTest Suites: 1 failed, 1 passed, 2 total\nTests:       1 failed, 9 passed, 10 total", "pos", False),
 ("jest-nofound", "jest", 1, "No tests found, exiting with code 1\nRun with `--passWithNoTests` to exit with code 0\nIn /x\n  12 files checked.\n  testMatch: **/__tests__/**/*.[jt]s?(x) - 0 matches", "zero", False),
 ("jest-passwithnotests", "jest --passWithNoTests", 0, "No tests found, exiting with code 0", "zero", False),
 ("jest-ts-err", "jest", 1, "FAIL src/a.test.ts\n  ● Test suite failed to run\n\n    src/a.ts:3:7 - error TS2322: Type 'string' is not assignable to type 'number'.\n\nTest Suites: 1 failed, 1 total\nTests:       0 total\nSnapshots:   0 total", "zero", True),
 ("jest-cannot-find", "jest", 1, "FAIL web/__tests__/sum.test.js\n  ● Test suite failed to run\n\n    Cannot find module '../summ' from 'web/__tests__/sum.test.js'\n\nTest Suites: 1 failed, 1 total\nTests:       0 total", "zero", True),
 ("vitest-pass", "vitest", 0, " ✓ src/a.test.ts (5)\n ✓ src/b.test.ts (2)\n\n Test Files  2 passed (2)\n      Tests  7 passed (7)\n   Start at  10:00:00\n   Duration  300ms", "pos", False),
 ("vitest-fail", "vitest", 1, " ❯ src/a.test.ts (5)\n   × adds\n\n Test Files  1 failed | 1 passed (2)\n      Tests  1 failed | 6 passed (7)", "pos", False),
 ("vitest-nofiles", "vitest", 1, "No test files found, exiting with code 1\n\ninclude: **/*.{test,spec}.?(c|m)[jt]s?(x)\nexclude:  **/node_modules/**", "zero", False),
 ("vitest-import-err", "vitest", 1, " FAIL  src/a.test.ts [ src/a.test.ts ]\nError: Failed to load url ./missing (resolved id: ./missing) in /x/src/a.test.ts. Does the file exist?\n\n Test Files  1 failed (1)\n      Tests  no tests\n   Duration  200ms", "zero", True),
 ("mocha-pass", "mocha", 0, "  sum\n    ✔ adds\n    ✔ adds floats\n    ✔ neg\n\n  3 passing (12ms)", "pos", False),
 ("mocha-fail", "mocha", 1, "  2 passing (10ms)\n  1 failing\n\n  1) sum\n       adds:\n     AssertionError [ERR_ASSERTION]: 3 == 4", "pos", False),
 ("mocha-zero", "mocha", 0, "\n\n  0 passing (1ms)\n", "zero", False),
 ("mocha-require-err", "mocha", 1, "Error: Cannot find module '../src/sum'\nRequire stack:\n- /x/test/sum.spec.js", "zero", True),
 ("go-pass", "go test ./...", 0, "ok  \texample.com/demo/pkg/calc\t0.002s", "pos", False),
 ("go-v-pass", "go test -v ./...", 0, "=== RUN   TestAdd\n--- PASS: TestAdd (0.00s)\n=== RUN   TestSub\n--- PASS: TestSub (0.00s)\nPASS\nok  \texample.com/demo/pkg/calc\t0.002s", "pos", False),
 ("go-fail", "go test ./...", 1, "--- FAIL: TestAdd (0.00s)\n    calc_test.go:8: Add(2,2) = 5; want 4\nFAIL\nFAIL\texample.com/demo/pkg/calc\t0.002s\nFAIL", "pos", False),
 ("go-notestfiles", "go test ./...", 0, "?   \texample.com/demo/pkg/calc\t[no test files]", "zero", False),
 ("go-run-nomatch", "go test -run Nope ./...", 0, "testing: warning: no tests to run\nPASS\nok  \texample.com/demo/pkg/calc\t0.001s [no tests to run]", "zero", False),
 ("go-compile-err", "go test ./...", 1, "# example.com/demo/pkg/calc [example.com/demo/pkg/calc.test]\npkg/calc/calc_test.go:6:9: undefined: Addd\nFAIL\texample.com/demo/pkg/calc [build failed]\nFAIL", "zero", True),
 ("go-v-fail-mixed", "go test -v ./...", 1, "=== RUN   TestAdd\n--- FAIL: TestAdd (0.00s)\n=== RUN   TestSub\n--- PASS: TestSub (0.00s)\nFAIL\nFAIL\texample.com/demo/pkg/calc\t0.002s", "pos", False),
 ("go-panic-nil", "go test ./...", 1, "--- FAIL: TestAdd (0.00s)\npanic: runtime error: invalid memory address or nil pointer dereference [recovered]\nFAIL\texample.com/demo/pkg/calc\t0.003s", "pos", False),
 ("mvn-pass", "mvn test", 0, "[INFO] -------------------------------------------------------\n[INFO]  T E S T S\n[INFO] -------------------------------------------------------\n[INFO] Running com.x.CalcTest\n[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.05 s - in com.x.CalcTest\n[INFO] \n[INFO] Results:\n[INFO] \n[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0\n[INFO] BUILD SUCCESS", "pos", False),
 ("mvn-fail", "mvn test", 1, "[ERROR] Tests run: 3, Failures: 1, Errors: 0, Skipped: 0, Time elapsed: 0.05 s <<< FAILURE! - in com.x.CalcTest\n[ERROR] adds  Time elapsed: 0.01 s  <<< FAILURE!\norg.opentest4j.AssertionFailedError: expected: <4.0> but was: <5.0>\n[ERROR] Failures: \n[ERROR]   CalcTest.adds:9 expected: <4.0> but was: <5.0>\n[ERROR] Tests run: 3, Failures: 1, Errors: 0, Skipped: 0\n[INFO] BUILD FAILURE", "pos", False),
 ("mvn-notests", "mvn test", 0, "[INFO] --- maven-surefire-plugin:3.2.2:test (default-test) @ demo ---\n[INFO] No tests to run.\n[INFO] BUILD SUCCESS", "zero", False),
 ("mvn-dtest-nomatch", "mvn -Dtest=Foo test", 1, "[INFO] BUILD FAILURE\n[ERROR] Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin:3.2.2:test (default-test) on project demo: No tests matching pattern \"Foo\" were executed! (Set -Dsurefire.failIfNoSpecifiedTests=false to ignore this error.)", "zero", False),
 ("mvn-compile-err", "mvn test", 1, "[INFO] --- maven-compiler-plugin:3.11.0:testCompile (default-testCompile) @ demo ---\n[ERROR] COMPILATION ERROR : \n[INFO] -------------------------------------------------------------\n[ERROR] /x/src/test/java/com/x/CalcTest.java:[9,22] cannot find symbol\n  symbol:   method addd(int,int)\n  location: class com.x.Calc\n[INFO] 1 error\n[INFO] -------------------------------------------------------------\n[INFO] BUILD FAILURE", "zero", True),
 ("gradle-pass", "./gradlew test", 0, "> Task :compileJava\n> Task :compileTestJava\n> Task :test\n\nBUILD SUCCESSFUL in 3s\n4 actionable tasks: 4 executed", "pos", False),
 ("gradle-fail", "./gradlew test", 1, "> Task :test FAILED\n\nCalcTest > adds() FAILED\n    org.opentest4j.AssertionFailedError at CalcTest.java:9\n\n3 tests completed, 1 failed\n\nFAILURE: Build failed with an exception.", "pos", False),
 ("gradle-nosource", "./gradlew test", 0, "> Task :compileTestJava NO-SOURCE\n> Task :test NO-SOURCE\n\nBUILD SUCCESSFUL in 1s", "zero", False),
 ("gradle-filter-nomatch", "./gradlew test --tests '*Foo'", 1, "> Task :test FAILED\n\nFAILURE: Build failed with an exception.\n\n* What went wrong:\nExecution failed for task ':test'.\n> No tests found for given includes: [*Foo](--tests filter)", "zero", False),
 ("gradle-java-compile-err", "./gradlew test", 1, "> Task :compileTestJava FAILED\n/x/src/test/java/com/x/CalcTest.java:9: error: cannot find symbol\n        assertEquals(4.0, Calc.addd(2, 2));\n                              ^\n  symbol:   method addd(int,int)\n1 error\n\nFAILURE: Build failed with an exception.", "zero", True),
 ("gradle-kotlin-compile-err", "./gradlew test", 1, "> Task :compileTestKotlin FAILED\ne: file:///x/src/test/kotlin/CalcTest.kt:9:22 Unresolved reference: addd\n\nFAILURE: Build failed with an exception.\n* What went wrong:\nExecution failed for task ':compileTestKotlin'.", "zero", True),
 ("cargo-pass", "cargo test", 0, "   Compiling demo v0.1.0\n    Finished test [unoptimized + debuginfo] target(s) in 0.5s\n     Running unittests src/lib.rs\n\nrunning 3 tests\ntest tests::a ... ok\ntest tests::b ... ok\ntest tests::c ... ok\n\ntest result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\n   Doc-tests demo\n\nrunning 0 tests\n\ntest result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s", "pos", False),
 ("cargo-fail", "cargo test", 101, "running 3 tests\ntest tests::a ... FAILED\n\nfailures:\n---- tests::a stdout ----\nthread 'tests::a' panicked at src/lib.rs:8:9:\nassertion `left == right` failed\n\ntest result: FAILED. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out", "pos", False),
 ("cargo-filtered", "cargo test nope", 0, "running 0 tests\n\ntest result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 3 filtered out; finished in 0.00s", "zero", False),
 ("cargo-all-ignored", "cargo test", 0, "running 3 tests\ntest a ... ignored\ntest b ... ignored\ntest c ... ignored\n\ntest result: ok. 0 passed; 0 failed; 3 ignored; 0 measured; 0 filtered out", "zero", False),
 ("cargo-compile-err", "cargo test", 101, "   Compiling demo v0.1.0 (/x)\nerror[E0425]: cannot find function `addd` in this scope\n --> src/lib.rs:8:20\n  |\n8 |         assert_eq!(addd(2, 2), 4);\n  |                    ^^^^ help: a function with a similar name exists: `add`\n\nFor more information about this error, try `rustc --explain E0425`.\nerror: could not compile `demo` (lib test) due to 1 previous error", "zero", True),
 ("dotnet-pass-new", "dotnet test", 0, "  Determining projects to restore...\n  Demo.Tests -> /x/bin/Debug/net8.0/Demo.Tests.dll\nTest run for /x/bin/Debug/net8.0/Demo.Tests.dll (.NETCoreApp,Version=v8.0)\n\nPassed!  - Failed:     0, Passed:     5, Skipped:     0, Total:     5, Duration: 30 ms - Demo.Tests.dll (net8.0)", "pos", False),
 ("dotnet-fail-new", "dotnet test", 1, "  Failed Demo.Tests.CalcTests.Adds [12 ms]\n  Error Message:\n   Assert.Equal() Failure\n\nFailed!  - Failed:     1, Passed:     4, Skipped:     0, Total:     5, Duration: 40 ms - Demo.Tests.dll (net8.0)", "pos", False),
 ("dotnet-pass-vstest", "dotnet test", 0, "Total tests: 5\n     Passed: 5\n Total time: 1.2 Seconds", "pos", False),
 ("dotnet-notests", "dotnet test", 0, "Test run for /x/Demo.Tests.dll (.NETCoreApp,Version=v8.0)\nNo test is available in /x/Demo.Tests.dll. Make sure that test discoverer & executors are registered and platform & framework version settings are appropriate and try again.", "zero", False),
 ("dotnet-compile-err", "dotnet test", 1, "/x/CalcTests.cs(9,22): error CS0103: The name 'addd' does not exist in the current context [/x/Demo.Tests.csproj]\n\nBuild FAILED.\n\n/x/CalcTests.cs(9,22): error CS0103: The name 'addd' does not exist in the current context [/x/Demo.Tests.csproj]\n    0 Warning(s)\n    1 Error(s)", "zero", True),
 ("rspec-pass", "rspec", 0, ".....\n\nFinished in 0.01 seconds (files took 0.1 seconds to load)\n5 examples, 0 failures", "pos", False),
 ("rspec-fail", "rspec", 1, "..F..\n\nFailures:\n\n  1) Calc adds\n     Failure/Error: expect(add(2,2)).to eq(5)\n\nFinished in 0.02 seconds\n5 examples, 1 failure\n\nFailed examples:\n\nrspec ./spec/calc_spec.rb:4 # Calc adds", "pos", False),
 ("rspec-zero", "rspec", 0, "No examples found.\n\nFinished in 0.0003 seconds (files took 0.05 seconds to load)\n0 examples, 0 failures", "zero", False),
 ("rspec-load-err", "rspec", 1, "An error occurred while loading ./spec/calc_spec.rb.\nFailure/Error: require_relative '../lib/calc'\n\nLoadError:\n  cannot load such file -- /x/lib/calc\n# ./spec/calc_spec.rb:1:in `require_relative'\nNo examples found.\n\nFinished in 0.00004 seconds (files took 0.1 seconds to load)\n0 examples, 0 failures, 1 error occurred outside of examples", "zero", True),
 ("jest-404-name", "jest", 1, "FAIL api.test.js\n  ✕ returns 404 error for missing user (5 ms)\n\nTests:       1 failed, 1 total", "pos", False),
 ("playwright-pass", "npx playwright test", 0, "Running 5 tests using 2 workers\n\n  5 passed (3.2s)", "pos", False),
]

def setup():
    if os.path.exists(W): shutil.rmtree(W)
    os.makedirs(D); os.makedirs(FX)
    shutil.copytree(KIT + "/.claude", D + "/.claude"); os.makedirs(D + "/.devloop")
    subprocess.run("git init -q", shell=True, cwd=D)

def run(c):
    cid, runner, rc, out, truth, tload = c
    fx = f"{FX}/{cid}.log"; open(fx, "w").write(out + "\n")
    cfg = f'version: 1\ncommands:\n  test: "cat {fx}; exit {rc}"\n'
    open(D + "/.devloop/config.yaml", "w").write(cfg)
    r = subprocess.run(["bash", D + "/.claude/hooks/devloop-run.sh", "test", "--label", cid], cwd=D, env=dict(os.environ, CLAUDE_PROJECT_DIR=D), capture_output=True, text=True)
    f = dict(re.findall(r"^(EXIT|TESTS_RAN|LOAD_ERROR): (.*)$", r.stdout, re.M))
    ran = f.get("TESTS_RAN"); load = f.get("LOAD_ERROR") == "yes"; ex = f.get("EXIT")
    probs = []
    if truth == "pos":
        if ran == "0": probs.append("FP:zero-reported")
    else:
        if rc == 0 and ran != "0": probs.append("FN:false-PASS(zero tests undetected)")
        elif rc != 0 and ran not in ("0", "unknown"): probs.append(f"WRONG:TESTS_RAN={ran}")
        elif rc != 0 and ran == "unknown" and not tload: probs.append("FN:zero-tests reported as ordinary failure")
    if tload and not load: probs.append("FN:LOAD_ERROR missed")
    if load and not tload: probs.append("FP:LOAD_ERROR")
    return dict(id=cid, runner=runner, exit=ex, ran=ran, load=load, truth=truth, tload=tload, probs=probs)

if __name__ == "__main__":
    setup()
    res = [run(c) for c in C]
    for x in res:
        print(f"{x['id']:28} EXIT={x['exit']:13} RAN={x['ran']:8} LOAD={'yes' if x['load'] else 'no ':3} truth={x['truth']:4}/{'load' if x['tload'] else '-'} {'OK' if not x['probs'] else ' '.join(x['probs'])}")
    bad = [x for x in res if x['probs']]
    print(f"\n{len(res)} cases, {len(bad)} wrong ({(len(res)-len(bad))/len(res)*100:.0f}% fully correct)")
    print("FN:", sum(any(p.startswith('FN') for p in x['probs']) for x in res), "FP:", sum(any(p.startswith('FP') for p in x['probs']) for x in res), "WRONG count:", sum(any(p.startswith('WRONG') for p in x['probs']) for x in res))
    unk = [x['id'] for x in res if x['ran'] == 'unknown' and x['truth'] == 'pos']
    print("pos-but-unknown (uninformative):", unk)
    json.dump(res, open(W + "/results.json", "w"), indent=1)
