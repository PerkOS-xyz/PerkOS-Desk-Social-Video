# Social video formats

The video entries are desk export presets in pixels. X's sizes fit its published web upload range. TikTok's preset fits its API pixel limits, and Meta recommends 9:16 for Reels. The exact TikTok and Instagram export sizes, including the Instagram 4:5 Feed preset, are unverified as platform recommendations.

Video durations are in seconds. The scope beside each limit identifies the publishing route. TikTok and Instagram API limits are verified for those routes. Their in-app limits are unverified. The Instagram Feed preset uses the Reel duration when sharing a Reel to Feed. A separate Feed upload limit is unverified.

The desk's X cap is 260 in the same weighted units as the platform limit. A null desk cap means the desk uses the documented platform limit. Thread support refers to publishing connected posts from one author. The desk uses single posts for TikTok and Instagram, where native thread support is unverified.

- X documents standard posts, video uploads, weighted counting, and native threads. [Posts](https://help.x.com/en/using-x/how-to-post), [Video uploads](https://help.x.com/en/using-x/x-videos), [Counting characters](https://docs.x.com/fundamentals/counting-characters), [Threads](https://help.x.com/en/using-x/create-a-thread)
- TikTok documents API upload limits and Direct Post captions. Its camera tools help page returned no readable content. [Media Transfer Guide](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide), [Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post), [Camera tools](https://support.tiktok.com/en/using-tiktok/creating-videos/camera-tools)
- Meta documents Reel uploads, Feed sharing, and captions. Instagram's Help Center rate-limited the Reel format page. [Instagram API media reference](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media), [Reel size help](https://help.instagram.com/1631821640426723)

Run the format test with `node --test formats/formats.test.mjs`.
