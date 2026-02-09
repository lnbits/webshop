<a href="https://lnbits.com" target="_blank" rel="noopener noreferrer">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://i.imgur.com/QE6SIrs.png">
    <img src="https://i.imgur.com/fyKPgVT.png" alt="LNbits" style="width:280px">
  </picture>
</a>

[![License: MIT](https://img.shields.io/badge/License-MIT-success?logo=open-source-initiative&logoColor=white)](./LICENSE)
[![Built for LNbits](https://img.shields.io/badge/Built%20for-LNbits-4D4DFF?logo=lightning&logoColor=white)](https://github.com/lnbits/lnbits)

# WebShop - [LNbits](https://lnbits.com) extension

An embeddable web shop for selling products with lightning payments. Use it as a standalone page, embed it with an iframe, or mount it as a same-origin component.

## How it works

Create products with prices and descriptions tied to the LNbits _Inventory_ extension. The extension generates a shop page that can be embedded in your website or shared directly. Customers browse, add items to cart, and pay with lightning.

## Features

- Product catalog management
- Shopping cart functionality
- Embeddable via iframe
- Same-origin component embed
- Lightning checkout

## Usage

1. Enable the extension in LNbits
2. Add your products with prices and images
3. Embed the shop in your website or share the link
4. Customers pay with lightning at checkout

## Embed modes

### Iframe embed (cross-origin friendly)

Use an iframe to embed into external websites:

```html
<iframe
  src="https://your-lnbits-domain/webshop/<SHOP_ID>?embed=iframe"
  width="100%"
  height="900"
  style="border:0; border-radius:12px;"
></iframe>
```

Notes:

- `?embed=iframe` enables iframe-specific behavior.
- Invoice copy button is hidden in iframe mode.

### Component embed (same-origin)

For pages served from the same LNbits server (for example via `webpages`), mount the shop as a component:

```html
<div id="lnbits-webshop-<SHOP_ID>"></div>
<script src="/webshop/static/js/public_page.js"></script>
<script>
  WebshopPublicPage.mount('#lnbits-webshop-<SHOP_ID>', {
    shopId: '<SHOP_ID>'
  }).catch(console.error)
</script>
```

Notes:

- Component mode avoids iframe interaction issues.
- Invoice copy button is available in component and direct page mode.

## Powered by LNbits

[LNbits](https://lnbits.com) is a free and open-source lightning accounts system.

[![Visit LNbits Shop](https://img.shields.io/badge/Visit-LNbits%20Shop-7C3AED?logo=shopping-cart&logoColor=white&labelColor=5B21B6)](https://shop.lnbits.com/)
[![Try myLNbits SaaS](https://img.shields.io/badge/Try-myLNbits%20SaaS-2563EB?logo=lightning&logoColor=white&labelColor=1E40AF)](https://my.lnbits.com/login)
