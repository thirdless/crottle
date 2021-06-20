import importlib as importer%rand%

def secure_importer(name, globals=None, locals=None, fromlist=(), level=0):
    frommodule = globals['__name__'] if globals else None

    if name not in %list%:
        print("Importarea acestui modul este momentan dezactivată")
        return False

    return importer%rand%.__import__(name, globals, locals, fromlist, level)

open = None
input = None
__builtins__['__import__'] = secure_importer

%code%