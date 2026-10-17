#!/usr/bin/env python3
"""Ghost Mode: redact secrets from a stream.

  some-command 2>&1 | ghost.py          # filter a pipe
  ghost.py --shell                      # run $SHELL with all output redacted
  ghost.py --selftest
"""
import os, pty, re, select, sys

PATTERNS = [
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----",
    r"sk-ant-[A-Za-z0-9_-]{20,}",
    r"sk-[A-Za-z0-9_-]{20,}",
    r"gh[pousr]_[A-Za-z0-9]{30,}",
    r"github_pat_[A-Za-z0-9_]{30,}",
    r"hf_[A-Za-z0-9]{30,}",
    r"AKIA[0-9A-Z]{16}",
    r"xox[abprs]-[A-Za-z0-9-]{10,}",
    r"AIza[0-9A-Za-z_-]{35}",
    r"eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}",  # JWT
]
RX = re.compile("|".join(f"(?:{p})" for p in PATTERNS))
# Name-prefixed secrets ("Bearer x", KEY=x, "token": "x"): keep the prefix, mask the value.
KV = re.compile(
    r"(?i)(\bbearer\s+|(?:api[_-]?key|secret|token|passw(?:or)?d|auth)[\"']?\s*[:=]\s*)[\"']?[^\s\"',;]{6,}"
)
MASK = "[REDACTED]"


def redact(s: str) -> str:
    return KV.sub(lambda m: m.group(1) + MASK, RX.sub(MASK, s))


def selftest():
    cases = {
        "export ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwx": "sk-ant-",
        "token: ghp_" + "a" * 36: "ghp_a",
        "Authorization: Bearer abcdef0123456789abcdef": "abcdef0123456789",
        "aws AKIAIOSFODNN7EXAMPLE": "AKIAIOSFODNN7",
        'password="hunter2hunter2"': "hunter2",
        "-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----": "MIIabc",
    }
    for text, leak in cases.items():
        out = redact(text)
        assert leak not in out and MASK in out, (text, out)
    clean = "ls -la /tmp && git status # nothing secret here, token count 5"
    assert redact(clean) == clean, redact(clean)
    print("ghost selftest ok")


def stream(fd_read):
    # Line-buffered; a secret split across reads is a known gap (ponytail: add carry-over buffer if needed).
    buf = b""
    while True:
        try:
            chunk = fd_read(4096)
        except OSError:
            chunk = b""
        if not chunk:
            break
        buf += chunk
        *lines, buf = buf.split(b"\n")
        for ln in lines:
            sys.stdout.write(redact(ln.decode(errors="replace")) + "\n")
        sys.stdout.flush()
    if buf:
        sys.stdout.write(redact(buf.decode(errors="replace")))
        sys.stdout.flush()


def main():
    if "--selftest" in sys.argv:
        return selftest()
    if "--shell" in sys.argv:
        shell = os.environ.get("SHELL", "/bin/sh")
        pid, fd = pty.fork()
        if pid == 0:
            os.execvp(shell, [shell])
        # Forward stdin to the shell; redact everything it prints.
        sin, buf = sys.stdin.fileno(), b""
        while True:
            ready = select.select([fd] + ([sin] if sin >= 0 else []), [], [])[0]
            if sin in ready:
                data = os.read(sin, 4096)
                if data:
                    os.write(fd, data)
                else:
                    os.write(fd, b"\x04")  # EOF -> shell exits
                    sin = -1
                    continue
            if fd in ready:
                try:
                    chunk = os.read(fd, 4096)
                except OSError:
                    break
                if not chunk:
                    break
                buf += chunk
                *lines, buf = buf.split(b"\n")
                for ln in lines:
                    sys.stdout.write(redact(ln.decode(errors="replace")) + "\n")
                sys.stdout.flush()
        sys.stdout.write(redact(buf.decode(errors="replace")))
        os.waitpid(pid, 0)
        return
    stream(lambda n: os.read(sys.stdin.fileno(), n))


if __name__ == "__main__":
    main()
