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

The desk is released with tags (`v1.0.0`). PerkOS Runtime installs a tagged version and the plugin versions in its lock.

`plugins.lock` is JSON. Its `source` is the [PerkOS Runtime Plugins repository](https://github.com/PerkOS-xyz/PerkOS-Runtime-Plugins), and `plugins` maps each plugin ID to one exact version. A pin such as `openscreen` at `0.1.0` refers to the upstream tag `openscreen@0.1.0`.

The initial pins are provisional until the upstream releases are available for testing. When updating a pin, verify the new release and update its capability entry in `test/plugins-lock.test.cjs`. The coverage test checks each seat's `uses` entries against the pinned versions once `desk.json` exists.
