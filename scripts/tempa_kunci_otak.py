#!/usr/bin/env python3
"""Tempa pasangan kunci ed25519 format OpenSSH (pengganti ssh-keygen).
Kunci privat: /home/z/my-project/.otak_deploy_key
Kunci publik: /home/z/my-project/.otak_deploy_key.pub
Dipakai khusus push repo Micaprofita-Otak via deploy key."""
import base64, os
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

priv = Ed25519PrivateKey.generate()
comment = "penjaga-otak-deploy"

# --- privat: format OpenSSH ---
pem = priv.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.OpenSSH,
    serialization.NoEncryption(),
)
with open("/home/z/my-project/.otak_deploy_key", "wb") as f:
    f.write(pem)
os.chmod("/home/z/my-project/.otak_deploy_key", 0o600)

# --- publik: wire format ssh-ed25519 ---
raw = priv.public_key().public_bytes(
    serialization.Encoding.Raw, serialization.PublicFormat.Raw
)
blob = b"".join([
    b"\x00\x00\x00\x0bssh-ed25519",
    len(raw).to_bytes(4, "big") + raw,
])
pub = "ssh-ed25519 " + base64.b64encode(blob).decode() + " " + comment
with open("/home/z/my-project/.otak_deploy_key.pub", "w") as f:
    f.write(pub + "\n")

print("kunci siap")
print(pub[:40] + "...")
