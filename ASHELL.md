# DAVE DevBox — iPhone a-Shell SSH Connection Guide

Connect to your GitHub Codespace from your iPhone using the free a-Shell app.

---

## Step 1: Install a-Shell on iPhone

Download **a-Shell** from the App Store (free):
https://apps.apple.com/app/a-shell/id1473805438

---

## Step 2: Generate SSH Key on iPhone (one-time setup)

Open a-Shell on your iPhone and run:

```
ssh-keygen -t ed25519 -C "my-iphone"
```

Press Enter for all prompts (no passphrase = easier to use).

Then show your public key:

```
cat ~/.ssh/id_ed25519.pub
```

Copy that entire line — you'll need it in Step 4.

---

## Step 3: Get Your Codespace SSH Details

In your Codespace terminal, run:

```bash
dave-status
```

Or get the Codespace name:

```bash
echo $CODESPACE_NAME
```

---

## Step 4: Add iPhone Key to Codespace

In your **Codespace terminal**, paste your iPhone public key:

```bash
echo "PASTE_YOUR_IPHONE_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## Step 5: Connect from a-Shell

GitHub Codespaces has a built-in SSH gateway. Connect from a-Shell:

```
ssh -p 443 YOUR_GITHUB_USERNAME@YOUR_CODESPACE_NAME.ssh.github.com
```

**Example:**
```
ssh -p 443 daviddan-241@dave-devbox-abc123.ssh.github.com
```

Your Codespace name format: `USERNAME-REPO-RANDOMID`
(check `echo $CODESPACE_NAME` in the Codespace terminal)

---

## Step 6: Save Connection as an Alias in a-Shell

In a-Shell, create a quick-connect alias. Edit `~/.profile`:

```
echo 'alias dave="ssh -p 443 YOUR_GITHUB_USERNAME@YOUR_CODESPACE_NAME.ssh.github.com"' >> ~/.profile
source ~/.profile
```

Then just type `dave` to connect instantly.

---

## Step 7: Use tmux to Keep Sessions Alive

Once connected via SSH, always use tmux:

```bash
# Start a persistent session
tmux new -s dave

# Work inside tmux — disconnect phone, session keeps running

# Reconnect later:
tmux attach -t dave
```

**Essential tmux keys:**
| Key | Action |
|---|---|
| `Ctrl+B D` | Detach (session stays alive) |
| `Ctrl+B C` | New window |
| `Ctrl+B N` | Next window |
| `Ctrl+B %` | Split vertically |
| `Ctrl+B "` | Split horizontally |
| `Ctrl+B [` | Scroll mode (q to quit) |

---

## Quick Reference Card (save this)

```
# On a-Shell (iPhone):
ssh -p 443 YOUR_USERNAME@YOUR_CODESPACE.ssh.github.com

# Once connected:
tmux attach -t dave   # rejoin session
dave-ai               # start AI coding
dave-status           # check everything
dave-tor-check        # verify Tor IP
anon-curl https://example.com  # anonymous web request
```

---

## Troubleshooting

**"Connection refused"**
- Codespace must be running (not stopped). Start it from github.com/codespaces

**"Permission denied (publickey)"**
- Re-do Step 4 — make sure the key is in `~/.ssh/authorized_keys`

**"Host key verification failed"**
- In a-Shell: `ssh-keygen -R YOUR_CODESPACE.ssh.github.com` then retry

**Codespace URL changed**
- Codespace SSH hostnames are stable as long as you don't delete and recreate
- Check current: `echo $CODESPACE_NAME` in Codespace

---

## Alternative: VS Code Mobile

You can also use **VS Code** on iPad/iPhone with Codespaces via browser:
- Open github.com/codespaces on Safari
- Click your running Codespace
- Full VS Code in browser with integrated terminal
