import resource
import signal
import sys
import importlib
import os
import pathlib

def cpu_limit(n, stack):
    print("CPU limit", file=sys.stderr)
    exit(1)

signal.signal(signal.SIGXCPU, cpu_limit)

soft, hard = resource.getrlimit(resource.RLIMIT_CPU)
resource.setrlimit(resource.RLIMIT_CPU, (8, hard)) # 8 sec max cpu time
soft, hard = resource.getrlimit(resource.RLIMIT_AS)
resource.setrlimit(resource.RLIMIT_AS, (20 * 1024 * 1024, hard)) # 20 MB

if(len(sys.argv) != 2):
    exit(1)

try:
    sys.tracebacklimit = -1
    dynamic_module = importlib.import_module(sys.argv[1])
except MemoryError:
    print("Memory limit", file=sys.stderr)
    exit(1)
except Exception as e:
    trace = sys.exc_info()[2]
    while trace is not None:
        trace = trace.tb_next
        if trace.tb_next is None:
            break
    errline = trace.tb_lineno
    print("Error:\n\t" + str(e) + "\n\ton line " + str(errline - 15), file=sys.stderr)