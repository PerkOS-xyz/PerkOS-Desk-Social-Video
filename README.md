# PerkOS Desk: Social Video

A PerkOS Runtime desk template that turns a product's real screens into short videos and posts for X, TikTok, Instagram and other networks.

## The team

| Seat | Does |
|---|---|
| Researcher | Reads the account's recent posts and their reach, and the work shipped since, and proposes an angle that does not repeat them |
| Writer | Writes the post or thread within each network's length |
| Recorder | Records the real app in a window sized to read on a phone, with no sound |
| Editor | Frames the takes, adds captions and logo cards, exports each network's format |
| Reviewer | Checks privacy, that every sentence matches what the app shows, and every frame |
| Person | Approves and publishes |

## Layout

```
desk.json        Seats, steps and questions
skills/          Rules each seat follows
formats/         Size and length for each network (16:9, 9:16, 4:5)
plugins.lock     The PerkOS Runtime plugin versions this desk was tested with
```

## Versions

PerkOS Runtime installs the tagged desk version and its pinned plugins. The first release is `v0.1.0`.

`plugins.lock` uses Runtime format 1. Each entry pins one plugin ID, an exact version, and the SHA-256 digest of its `plugin.zip`. A pin such as `openscreen` at `0.1.0` refers to the `openscreen@0.1.0` tag in the [PerkOS Runtime Plugins repository](https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins).

A `null` digest marks a pending pin during development. Once the pinned releases have a `plugin.zip`, run `npm run lock -- update` to fill their digests. When changing a pin, verify its capabilities and update the corresponding entry in `tests/plugins-lock.test.js`. Run `npm run release:check` before tagging to verify the complete lock, seat capabilities, desk manifest, seat skills, and network formats.
