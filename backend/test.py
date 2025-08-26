import sys, os, traceback

print(">>> script started", flush=True)
print("python:", sys.version, flush=True)
print("executable:", sys.executable, flush=True)
print("cwd:", os.getcwd(), flush=True)

try:
    import nba_api.stats.endpoints as endpoints
    print("imported nba_api.stats.endpoints OK", flush=True)
    names = [n for n in dir(endpoints) if n[0].isalpha()]
    for n in names[:20]:
        print(" -", n, flush=True)
    print(f"(+ {max(0, len(names)-20)} more...)", flush=True)
except Exception:
    print("!! exception during import:", flush=True)
    traceback.print_exc()

print(">>> done", flush=True)
