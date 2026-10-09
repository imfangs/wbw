---
title: "The Tail End · Interactive"
titleZh: "看看你还剩多少次 · 尾声互动版"
date: 2026-07-14
slug: tail-end-interactive
layout: page
sidebar: false
aside: false
navbar: false
---

<TailEnd />

<style>
/* 让互动页完全占满,不留 VitePress chrome */
.Layout:has(.app) .VPNav, .Layout:has(.app) .VPLocalNav, .Layout:has(.app) .VPFooter { display: none !important; }
.Layout:has(.app) .VPPage { padding: 0 !important; }
.Layout:has(.app) { min-height: 100vh; }
body:has(.app) { --vp-nav-height: 0px; --vp-layout-top-height: 0px; }
</style>
