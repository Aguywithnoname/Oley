"""Start Oley (no console window). Double-click this, or run "Start Oley.bat" the first time."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from oley.supervisor import main  # noqa: E402

if __name__ == "__main__":
    main(os.path.abspath(__file__))
