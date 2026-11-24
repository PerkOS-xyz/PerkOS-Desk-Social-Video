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

`plugins.lock` is strict JSON with a `source` set to the PerkOS Runtime Plugins repository URL and a `plugins` object keyed by unique plugin IDs. For example, an `ffmpeg` pin at `0.1.0` refers to the `ffmpeg@0.1.0` release. [PerkOS Runtime Plugins](https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins)

An exact version string marks a pending pin. Once the pinned releases have a `plugin.zip`, run `npm run lock -- update` to replace each string with an object containing `version` and a 64-character lowercase hexadecimal `sha256` of the archive. The lock tool validates both forms with the pinned Runtime resolver parser. [Runtime parser at f671272](https://github.com/PerkOS-xyz/PerkOS-Runtime/blob/f671272386583f1fb635dcb77c7716645e8be59f/src/shared/plugin-api.ts)

When changing a pin, verify its capabilities and update the corresponding entry in `tests/plugins-lock.test.js`. Run `npm run release:check` before tagging. It requires a digest for every pin and verifies the archive digests, seat capabilities, desk manifest, seat skills, and network formats.
