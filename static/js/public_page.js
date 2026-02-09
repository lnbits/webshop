;(() => {
  const WEBSHOP_TEMPLATE = `
    <div class="webshop-public-root">
      <q-layout view="hHh lpR lfr" class="webshop-layout">
        <q-page-container>
          <q-page class="q-pa-md">
            <div
              class="q-gutter-y-sm"
              style="max-width: 1200px; margin: 0 auto"
            >
              <div class="row q-col-gutter-sm items-center">
                <div class="col-12 col-md">
                  <q-input
                    dense
                    filled
                    v-model.trim="search"
                    placeholder="Search products"
                    clearable
                    @update:model-value="onSearch"
                  >
                    <template #prepend>
                      <q-icon name="search"></q-icon>
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-md-auto">
                  <q-btn
                    unelevated
                    color="primary"
                    icon="shopping_cart"
                    @click="showCart = true"
                    class="cart-btn"
                  >
                    <q-badge color="white" text-color="primary" floating>
                      <span v-text="cartCount"></span>
                    </q-badge>
                  </q-btn>
                </div>
              </div>

              <div class="row q-pb-sm q-col-gutter-xs items-center">
                <div class="col-12">
                  <div class="row q-gutter-xs">
                    <q-chip
                      v-for="tag in tags"
                      :key="tag"
                      clickable
                      outline
                      :color="selectedTag === tag ? 'primary' : 'grey-6'"
                      :text-color="selectedTag === tag ? 'white' : 'dark'"
                      @click="selectTag(tag)"
                    >
                      <span v-text="tag === '__all' ? 'All' : tag"></span>
                    </q-chip>
                  </div>
                </div>
              </div>

              <q-banner v-if="error" class="bg-red-1 text-red-9" rounded>
                <div v-text="error"></div>
              </q-banner>

              <div v-if="loading" class="row justify-center q-py-xl">
                <q-spinner color="primary" size="42px"></q-spinner>
              </div>

              <div v-else-if="!filtered.length" class="empty-state">
                <div class="text-subtitle1">No products to show yet.</div>
                <div class="text-caption text-grey-6">
                  Keep items active in Inventory to display them here.
                </div>
              </div>

              <div v-else class="row q-col-gutter-md">
                <div
                  v-for="product in filtered"
                  :key="product.id"
                  class="col-12 col-sm-6 col-md-3 col-lg-3"
                >
                  <q-card class="product-card column full-height">
                    <q-img
                      :src="productImage(product)"
                      :ratio="1.9"
                      class="product-image"
                    >
                      <div
                        class="tag-chip"
                        v-if="firstTag(product)"
                        v-text="firstTag(product)"
                      ></div>
                    </q-img>
                    <q-card-section class="q-px-sm q-pt-sm q-pb-none">
                      <div class="text-subtitle1 text-weight-bold">
                        <span v-text="product.name || 'Unnamed product'"></span>
                      </div>
                      <div class="text-caption text-grey-7 ellipsis-2-lines">
                        <span
                          v-text="product.description || 'No description provided yet.'"
                        ></span>
                      </div>
                    </q-card-section>
                    <q-card-section class="q-px-sm q-pt-xs q-pb-xs">
                      <div class="row items-center justify-between">
                        <div class="text-h6" v-text="priceLabel(product)"></div>
                        <div class="text-caption text-grey-6">
                          <span v-text="stockLabel(product)"></span>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-actions
                      class="q-pt-none q-px-sm q-pb-sm q-gutter-sm"
                    >
                      <q-btn
                        unelevated
                        color="primary"
                        label="Add to cart"
                        class="col"
                        @click="addToCart(product)"
                      ></q-btn>
                      <q-btn
                        flat
                        color="primary"
                        label="Details"
                        class="col"
                        @click="openProduct(product)"
                      ></q-btn>
                    </q-card-actions>
                  </q-card>
                </div>
              </div>

              <div class="row justify-center q-mt-lg" v-if="pageCount > 1">
                <q-pagination
                  v-model="page"
                  :max="pageCount"
                  max-pages="7"
                  direction-links
                  boundary-links
                  @update:model-value="onPageChange"
                ></q-pagination>
              </div>
            </div>
          </q-page>
        </q-page-container>
      </q-layout>

      <q-dialog v-model="showProduct" persistent position="top">
        <q-card class="product-dialog">
          <q-card-section class="row items-center justify-between">
            <div class="text-h6" v-text="focusedItem?.name || 'Product'"></div>
            <q-btn flat icon="close" @click="closeProduct"></q-btn>
          </q-card-section>
          <q-card-section>
            <q-carousel
              v-model="modalIndex"
              swipeable
              animated
              height="260px"
              control-color="primary"
              navigation
              v-if="modalImages.length"
            >
              <q-carousel-slide
                v-for="(img, idx) in modalImages"
                :key="idx"
                :name="idx"
                :img-src="img"
              ></q-carousel-slide>
            </q-carousel>
            <div v-else class="text-caption text-grey-6">No images</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="text-subtitle1 text-weight-bold q-mb-xs">
              <span v-text="priceLabel(focusedItem)"></span>
            </div>
            <div class="text-caption text-grey-7">
              <span
                v-text="focusedItem?.description || 'No description provided yet.'"
              ></span>
            </div>
            <div class="q-mt-sm row q-gutter-sm">
              <q-chip
                v-for="tag in tagsFor(focusedItem)"
                :key="tag"
                color="grey-3"
                text-color="dark"
                size="sm"
              >
                <span v-text="tag"></span>
              </q-chip>
            </div>
          </q-card-section>
          <q-card-actions class="q-pa-md">
            <q-btn
              unelevated
              color="primary"
              label="Add to cart"
              class="full-width"
              @click="addToCart(focusedItem)"
            ></q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>

      <q-dialog v-model="showCart" persistent position="top">
        <q-card class="cart-dialog">
          <q-card-section class="row items-center justify-between">
            <div class="text-h6">Checkout</div>
            <q-btn flat icon="close" @click="showCart = false"></q-btn>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-stepper
              v-model="checkoutStep"
              flat
              animated
              color="primary"
              header-nav
            >
              <q-step :name="1" title="Cart" icon="shopping_cart">
                <div
                  v-if="!cart.length"
                  class="text-caption text-grey-6 q-pa-md"
                >
                  Cart is empty. Add a product to get started.
                </div>
                <q-list v-else bordered separator>
                  <q-item v-for="entry in cart" :key="entry.id">
                    <q-item-section>
                      <q-item-label
                        class="text-weight-bold"
                        v-text="entry.name"
                      ></q-item-label>
                      <q-item-label
                        caption
                        v-text="priceLabel(entry)"
                      ></q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="row items-center q-gutter-xs">
                        <q-btn
                          dense
                          flat
                          icon="remove"
                          @click="updateQuantity(entry.id, -1)"
                        ></q-btn>
                        <div class="text-body2" v-text="entry.quantity"></div>
                        <q-btn
                          dense
                          flat
                          icon="add"
                          @click="updateQuantity(entry.id, 1)"
                        ></q-btn>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div class="row justify-between items-center q-mt-md">
                  <div class="text-subtitle2">Total</div>
                  <div class="text-h6" v-text="cartTotalLabel"></div>
                </div>
                <div class="row justify-end q-mt-md">
                  <q-btn
                    unelevated
                    color="primary"
                    label="Continue"
                    :disable="!cart.length"
                    @click="checkoutStep = 2"
                  ></q-btn>
                </div>
              </q-step>

              <q-step :name="2" title="Details" icon="local_shipping">
                <q-input
                  filled
                  v-model.trim="checkoutDetails.address"
                  label="Shipping address"
                  type="textarea"
                  :hint="requiredLabel('address')"
                ></q-input>
                <q-input
                  filled
                  v-model.trim="checkoutDetails.email"
                  label="Email"
                  :hint="requiredLabel('email')"
                ></q-input>
                <q-input
                  filled
                  v-model.trim="checkoutDetails.number"
                  label="Phone"
                  :hint="requiredLabel('number')"
                ></q-input>
                <div class="row justify-between q-mt-md">
                  <q-btn
                    flat
                    color="primary"
                    label="Back"
                    @click="checkoutStep = 1"
                  ></q-btn>
                  <q-btn
                    unelevated
                    color="primary"
                    label="Continue"
                    @click="goToPayment"
                  ></q-btn>
                </div>
              </q-step>

              <q-step :name="3" title="Payment" icon="credit_card">
                <div
                  v-if="!invoiceText && !invoicePaid"
                  class="row q-col-gutter-sm q-mb-md justify-center"
                >
                  <div class="col-12 col-sm-auto" v-if="allowBitcoin">
                    <q-btn
                      outline
                      color="primary"
                      :label="'Bitcoin / Lightning'"
                      :class="{'is-active': checkoutMethod === 'bitcoin'}"
                      @click="selectMethod('bitcoin')"
                    ></q-btn>
                  </div>
                  <div class="col-12 col-sm-auto" v-if="allowFiat">
                    <q-btn
                      outline
                      color="primary"
                      :label="fiatLabel"
                      :class="{'is-active': checkoutMethod === 'fiat'}"
                      @click="selectMethod('fiat')"
                    ></q-btn>
                  </div>
                </div>

                <q-banner
                  v-if="paymentStatus"
                  class="bg-grey-2 text-grey-9"
                  rounded
                >
                  <div v-text="paymentStatus"></div>
                </q-banner>

                <div v-if="invoicePaid" class="q-mt-md">
                  <q-banner class="bg-green-1 text-green-9" rounded>
                    <div>Payment received. Thank you for your order.</div>
                    <div class="text-caption">
                      Order ID <span v-text="orderId || '—'"></span>
                    </div>
                    <div v-if="orderPublicUrl" class="q-mt-sm">
                      <q-btn
                        flat
                        color="primary"
                        label="View order"
                        :href="orderPublicUrl"
                        target="_blank"
                        rel="noopener"
                      ></q-btn>
                    </div>
                  </q-banner>
                </div>

                <div v-if="invoiceQrSrc" class="q-mt-md">
                  <q-card
                    flat
                    bordered
                    class="q-pa-sm bg-white rounded-borders"
                  >
                    <div class="flex flex-center">
                      <q-img
                        :src="invoiceQrSrc"
                        :ratio="1"
                        class="invoice-qr rounded-borders"
                        fit="contain"
                      ></q-img>
                    </div>
                  </q-card>
                </div>
                <div v-if="invoiceText && !invoicePaid" class="q-mt-md">
                  <q-card
                    flat
                    bordered
                    class="q-pa-sm bg-white rounded-borders"
                  >
                    <div class="text-caption text-grey-6 q-mb-xs">
                      <span v-text="invoiceLabel"></span>
                    </div>
                    <div class="row items-center q-col-gutter-sm">
                      <div class="col">
                        <q-input
                          dense
                          outlined
                          readonly
                          :model-value="invoiceText"
                          class="invoice-input"
                          @focus="selectInvoiceText"
                        ></q-input>
                      </div>
                      <div class="col-auto" v-if="showInvoiceCopy">
                        <q-btn
                          flat
                          color="primary"
                          icon="content_copy"
                          @click="copyInvoiceText"
                        >
                          <q-tooltip>Copy</q-tooltip>
                        </q-btn>
                      </div>
                    </div>
                  </q-card>
                </div>
                <div class="row justify-start q-mt-md">
                  <q-btn
                    flat
                    color="primary"
                    label="Back"
                    @click="checkoutStep = 2"
                  ></q-btn>
                </div>
              </q-step>
            </q-stepper>
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  `

  const loadedScripts = Object.create(null)
  const loadedStyles = Object.create(null)
  const loadedInlineStyles = Object.create(null)
  const mountedApps = new WeakMap()

  const ensureNoTrailingSlash = value => String(value || '').replace(/\/+$/, '')

  const loadScriptOnce = src => {
    if (loadedScripts[src]) return loadedScripts[src]
    loadedScripts[src] = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`)
      if (existing) {
        if (existing.dataset.loaded === 'true') {
          resolve()
          return
        }
        existing.addEventListener('load', () => resolve(), {once: true})
        existing.addEventListener('error', () => reject(new Error(src)), {
          once: true
        })
        return
      }

      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.addEventListener(
        'load',
        () => {
          script.dataset.loaded = 'true'
          resolve()
        },
        {once: true}
      )
      script.addEventListener('error', () => reject(new Error(src)), {
        once: true
      })
      document.head.appendChild(script)
    })
    return loadedScripts[src]
  }

  const loadStyleOnce = href => {
    if (loadedStyles[href]) return loadedStyles[href]
    loadedStyles[href] = new Promise(resolve => {
      const existing = document.querySelector(`link[href="${href}"]`)
      if (existing) {
        resolve()
        return
      }
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.addEventListener('load', () => resolve(), {once: true})
      link.addEventListener('error', () => resolve(), {once: true})
      document.head.appendChild(link)
    })
    return loadedStyles[href]
  }

  const loadInlineStyleOnce = (id, cssText) => {
    if (loadedInlineStyles[id]) return loadedInlineStyles[id]
    loadedInlineStyles[id] = Promise.resolve().then(() => {
      const existing = document.getElementById(id)
      if (existing) return
      const style = document.createElement('style')
      style.id = id
      style.textContent = cssText
      document.head.appendChild(style)
    })
    return loadedInlineStyles[id]
  }

  const resolveTarget = target => {
    if (typeof target === 'string') return document.querySelector(target)
    if (target && target.nodeType === 1) return target
    return null
  }

  const normalizeTag = tag => (tag || '').toString().trim().toLowerCase()

  const parseTags = raw => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(Boolean)
    return String(raw)
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  }

  const isFiatCurrency = currency => {
    const value = (currency || '').toString().toLowerCase()
    return value && value !== 'sat' && value !== 'sats'
  }

  const isBase64String = value =>
    typeof value === 'string' &&
    value.includes('data:') &&
    value.includes('base64')

  const normalizeImage = value => {
    if (!value) return null
    if (isBase64String(value)) return value
    if (String(value).startsWith('http')) return value
    return `${window.location.origin}/api/v1/assets/${value}/data`
  }

  const parseImages = item => {
    if (!item || item.images == null) return []
    if (Array.isArray(item.images)) {
      return item.images.map(normalizeImage).filter(Boolean)
    }
    const raw = String(item.images)
    if (!raw) return []
    const separator = raw.includes('|||') ? '|||' : ','
    return raw
      .split(separator)
      .map(val => normalizeImage(val.trim()))
      .filter(Boolean)
  }

  const formatAmount = (amount, currency) => {
    if (currency && !isFiatCurrency(currency)) {
      return String(Math.round(amount || 0))
    }
    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0)
    } catch (_) {
      return String(amount || 0)
    }
  }

  const createAppOptions = ({
    shop,
    shopId,
    inventoryId,
    placeholderImg,
    ordersBaseUrl,
    showInvoiceCopy = true
  }) => ({
    template: WEBSHOP_TEMPLATE,
    data() {
      return {
        shop: shop || {},
        shopId,
        inventoryId: inventoryId || (shop && shop.inventory_id) || '',
        products: [],
        filtered: [],
        tags: ['__all'],
        search: '',
        selectedTag: '__all',
        loading: false,
        error: '',
        cart: [],
        focusedItem: null,
        modalImages: [],
        modalIndex: 0,
        page: 1,
        pageSize: 8,
        totalItems: 0,
        checkoutStep: 1,
        checkoutDetails: {
          address: '',
          email: '',
          number: ''
        },
        orderId: '',
        ordersBaseUrl: ordersBaseUrl || window.location.origin,
        showInvoiceCopy,
        checkoutMethod: '',
        isPaying: false,
        invoice: null,
        invoiceSocket: null,
        paymentStatus: 'Select a method to continue.',
        showCart: false,
        showProduct: false
      }
    },
    computed: {
      pageCount() {
        return Math.max(1, Math.ceil(this.totalItems / this.pageSize))
      },
      cartCount() {
        return this.cart.reduce((sum, item) => sum + item.quantity, 0)
      },
      cartTotal() {
        return this.cart.reduce(
          (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
          0
        )
      },
      cartTotalLabel() {
        return `${formatAmount(this.cartTotal, this.shop.currency)} ${this.currencyLabel()}`
      },
      allowBitcoin() {
        return this.shop.allow_bitcoin !== false
      },
      allowFiat() {
        return (
          this.shop.allow_fiat !== false && isFiatCurrency(this.shop.currency)
        )
      },
      fiatLabel() {
        return isFiatCurrency(this.shop.currency)
          ? this.shop.currency.toUpperCase()
          : 'Fiat (Stripe)'
      },
      invoiceQrSrc() {
        if (
          !this.invoice ||
          !this.invoice.request ||
          this.invoice.paid ||
          this.invoice.isFiat
        )
          return ''
        return `/api/v1/qrcode?data=${encodeURIComponent(this.invoice.request)}`
      },
      invoicePaid() {
        return Boolean(this.invoice && this.invoice.paid)
      },
      invoiceText() {
        return this.invoice?.request || ''
      },
      invoiceLabel() {
        return this.invoice?.isFiat ? 'Payment link' : 'Invoice'
      },
      orderPublicUrl() {
        if (!this.orderId) return ''
        const base = (this.ordersBaseUrl || window.location.origin).replace(
          /\/+$/,
          ''
        )
        return `${base}/orders/${this.orderId}`
      }
    },
    methods: {
      currencyLabel() {
        if (!this.shop.currency) return ''
        return isFiatCurrency(this.shop.currency)
          ? this.shop.currency.toUpperCase()
          : 'sats'
      },
      tagsFor(item) {
        if (!item) return []
        if (!item.__tags) {
          item.__tags = parseTags(item.tags)
          item.__tagsLower = item.__tags.map(t => normalizeTag(t))
        }
        return item.__tags
      },
      tagsLowerFor(item) {
        if (!item) return []
        if (!item.__tagsLower) this.tagsFor(item)
        return item.__tagsLower || []
      },
      omitTagsLowerFor(item) {
        if (!item) return []
        if (!item.__omitTagsLower) {
          const raw = parseTags(item.omit_tags)
          item.__omitTagsLower = raw.map(t => normalizeTag(t))
        }
        return item.__omitTagsLower || []
      },
      firstTag(item) {
        const tags = this.tagsFor(item)
        return tags.length ? tags[0] : ''
      },
      selectTag(tag) {
        this.selectedTag = tag
        this.page = 1
        this.fetchProducts()
      },
      onSearch() {
        this.page = 1
        this.fetchProducts()
      },
      onPageChange() {
        window.scrollTo({top: 0, behavior: 'smooth'})
      },
      productImage(item) {
        const images = parseImages(item)
        if (!images.length) return placeholderImg
        return images[0]
      },
      priceLabel(item) {
        const price = Number(item?.price) || 0
        return `${formatAmount(price, this.shop.currency)} ${this.currencyLabel()}`
      },
      stockLabel(item) {
        if (!item) return ''
        if (
          item.quantity_in_stock === null ||
          item.quantity_in_stock === undefined
        ) {
          return 'Available'
        }
        if (item.quantity_in_stock <= 0) return 'Out of stock'
        return `${item.quantity_in_stock} left`
      },
      openProduct(item) {
        this.focusedItem = item
        const images = parseImages(item)
        this.modalImages = images.length ? images : [placeholderImg]
        this.modalIndex = 0
        this.showProduct = true
      },
      closeProduct() {
        this.showProduct = false
      },
      addToCart(item) {
        if (!item) return
        const existing = this.cart.find(i => i.id === item.id)
        const limit =
          typeof item.quantity_in_stock === 'number'
            ? Math.max(item.quantity_in_stock, 0)
            : Infinity
        if (existing) {
          if (existing.quantity >= limit) return
          existing.quantity += 1
        } else {
          this.cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: limit === Infinity ? 1 : Math.min(1, limit),
            quantity_in_stock: item.quantity_in_stock,
            weight_grams: item.weight_grams
          })
        }
      },
      updateQuantity(id, delta) {
        const entry = this.cart.find(i => i.id === id)
        if (!entry) return
        const limit =
          typeof entry.quantity_in_stock === 'number'
            ? Math.max(entry.quantity_in_stock, 0)
            : Infinity
        entry.quantity = Math.min(
          Math.max(entry.quantity + delta, 0),
          limit || 0
        )
        if (entry.quantity <= 0) {
          this.cart = this.cart.filter(i => i.id !== id)
        }
      },
      requiredFields() {
        return parseTags(this.shop.required_customer_info || '').map(t =>
          t.toLowerCase()
        )
      },
      requiredLabel(key) {
        return this.requiredFields().includes(key) ? 'Required' : 'Optional'
      },
      validateCustomerInfo() {
        const req = this.requiredFields()
        const missing = []
        const address = (this.checkoutDetails.address || '').trim()
        const email = (this.checkoutDetails.email || '').trim()
        const number = (this.checkoutDetails.number || '').trim()
        if (req.includes('address') && !address)
          missing.push('shipping address')
        if (req.includes('email') && !email) missing.push('email')
        if (req.includes('number') && !number) missing.push('number')
        if (missing.length) {
          Quasar.Notify.create({
            type: 'warning',
            message: `Please provide: ${missing.join(', ')}`
          })
          return false
        }
        return true
      },
      selectMethod(method) {
        this.checkoutMethod = method
        if (this.isPaying || this.invoice?.request) return
        this.submitCheckout()
      },
      goToPayment() {
        if (!this.validateCustomerInfo()) return
        this.checkoutStep = 3
      },
      async submitCheckout() {
        if (!this.checkoutMethod) {
          Quasar.Notify.create({
            type: 'warning',
            message: 'Select a payment method'
          })
          return
        }
        if (!this.cart.length) {
          Quasar.Notify.create({type: 'warning', message: 'Cart is empty'})
          return
        }
        if (!this.validateCustomerInfo()) return

        this.isPaying = true
        this.paymentStatus = 'Creating order...'
        try {
          const summaryName =
            this.cart.length === 1
              ? this.cart[0].name
              : `${this.cart.length} items`
          const payload = {
            product: summaryName,
            quantity: this.cart.reduce((sum, item) => sum + item.quantity, 0),
            address: this.checkoutDetails.address || null,
            email: this.checkoutDetails.email || null,
            number: this.checkoutDetails.number || null,
            items: this.cart.map(entry => ({
              id: entry.id,
              name: entry.name,
              quantity: entry.quantity,
              price: entry.price,
              weight_grams: entry.weight_grams
            })),
            payment_method: this.checkoutMethod,
            fiat_provider:
              this.checkoutMethod === 'fiat'
                ? this.shop.fiat_provider || null
                : null
          }
          const baseUrl = window.location.origin
          const response = await fetch(
            `/webshop/api/v1/client_data/public/${this.shopId}?base_url=${encodeURIComponent(
              baseUrl
            )}`,
            {
              method: 'PUT',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(payload)
            }
          )
          if (!response.ok) throw new Error('Failed to start checkout')
          const data = await response.json()
          this.orderId = data.client_data_id || this.orderId || ''
          const isFiat = Boolean(data.is_fiat)
          const lightningRequest = data.payment_request || ''
          const fiatLink = data.fiat_payment_request || ''
          if (lightningRequest || fiatLink) {
            this.invoice = {
              request: isFiat ? fiatLink : lightningRequest,
              hash: data.payment_hash,
              paid: false,
              isFiat
            }
            this.startInvoiceWatcher()
            if (isFiat) {
              if (fiatLink) {
                window.open(fiatLink, '_blank', 'noopener')
                this.paymentStatus = 'Redirected to payment provider...'
              } else {
                this.paymentStatus = 'Missing fiat checkout link.'
              }
            }
          }
          if (!isFiat) {
            this.paymentStatus = 'Awaiting payment...'
          }
          Quasar.Notify.create({
            type: 'positive',
            message: 'Order captured. Complete payment to finish.'
          })
        } catch (err) {
          console.error(err)
          this.paymentStatus = 'Failed to create order.'
          Quasar.Notify.create({
            type: 'negative',
            message: 'Failed to start checkout'
          })
        } finally {
          this.isPaying = false
        }
      },
      startInvoiceWatcher() {
        if (!this.invoice?.hash) return
        if (this.invoiceSocket) {
          this.invoiceSocket.close()
          this.invoiceSocket = null
        }
        try {
          const url = new URL(window.location.href)
          url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
          url.pathname = `/api/v1/ws/${this.invoice.hash}`
          const ws = new WebSocket(url.toString())
          this.invoiceSocket = ws
          ws.addEventListener('message', ({data}) => {
            const payment = JSON.parse(data)
            if (payment.pending === false) {
              this.invoice.paid = true
              this.paymentStatus = 'Payment received.'
              this.cart = []
              this.checkoutStep = 3
              ws.close()
            }
          })
          ws.addEventListener('close', () => {
            this.invoiceSocket = null
          })
        } catch (err) {
          console.warn(err)
          Quasar.Notify.create({
            type: 'negative',
            message: 'Error waiting for payment.'
          })
        }
      },
      selectInvoiceText(event) {
        const input = event?.target
        if (input && typeof input.select === 'function') {
          input.select()
        }
      },
      async copyInvoiceText() {
        const value = this.invoiceText
        if (!value) {
          return
        }
        try {
          await navigator.clipboard.writeText(value)
          Quasar.Notify.create({
            type: 'positive',
            message: this.invoice?.isFiat
              ? 'Payment link copied.'
              : 'Invoice copied.'
          })
        } catch (err) {
          console.warn(err)
          Quasar.Notify.create({
            type: 'negative',
            message: 'Clipboard copy failed.'
          })
        }
      },
      async fetchTags() {
        if (!this.inventoryId) return
        try {
          const params = new URLSearchParams({
            limit: 200,
            offset: 0,
            sortby: 'created_at',
            direction: 'desc',
            is_active: true
          })
          const response = await fetch(
            `/inventory/api/v1/items/${this.inventoryId}/paginated?${params.toString()}`
          )
          if (!response.ok) return
          const payload = await response.json()
          const items = Array.isArray(payload.data)
            ? payload.data.filter(Boolean)
            : []
          const allowedTags = parseTags(this.shop.allowed_tags)
            .map(t => normalizeTag(t))
            .filter(Boolean)
          const omitTags = parseTags(this.shop.omit_tags)
            .map(t => normalizeTag(t))
            .filter(Boolean)
          const tags = ['__all']
          items.forEach(item => {
            const lower = this.tagsLowerFor(item)
            lower.forEach(tag => {
              const allowedOk = !allowedTags.length || allowedTags.includes(tag)
              const notOmitted = !omitTags.length || !omitTags.includes(tag)
              if (tag && allowedOk && notOmitted && !tags.includes(tag)) {
                tags.push(tag)
              }
            })
          })
          this.tags = tags
        } catch (err) {
          console.error(err)
        }
      },
      filterProducts() {
        const activeTag = normalizeTag(this.selectedTag)
        const allowed = parseTags(this.shop.allowed_tags || '')
          .map(t => normalizeTag(t))
          .filter(Boolean)
        const omitList = parseTags(this.shop.omit_tags || '')
          .map(t => normalizeTag(t))
          .filter(Boolean)
        this.filtered = this.products.filter(item => {
          const qty = item?.quantity_in_stock
          if (typeof qty === 'number' && qty <= 0) return false
          const itemTags = this.tagsLowerFor(item)
          const matchesTag =
            activeTag === '__all' || itemTags.includes(activeTag)
          const matchesAllowed =
            !allowed.length || itemTags.some(t => allowed.includes(t))
          const itemOmit = this.omitTagsLowerFor(item)
          const hasOmit =
            omitList.length && itemOmit.some(t => omitList.includes(t))
          return matchesTag && matchesAllowed && !hasOmit
        })
      },
      async fetchProducts() {
        if (!this.inventoryId) {
          this.error = 'No inventory linked to this shop yet.'
          return
        }
        this.error = ''
        this.loading = true
        try {
          const params = new URLSearchParams({
            limit: this.pageSize,
            offset: Math.max(0, (this.page - 1) * this.pageSize),
            sortby: 'created_at',
            direction: 'desc',
            is_active: true
          })
          const activeTag = normalizeTag(this.selectedTag)
          if (activeTag && activeTag !== '__all') params.set('tags', activeTag)
          const searchTerm = this.search.trim()
          if (searchTerm) params.set('search', searchTerm)
          const response = await fetch(
            `/inventory/api/v1/items/${this.inventoryId}/paginated?${params.toString()}`
          )
          if (!response.ok) throw new Error('Unable to load products.')
          const payload = await response.json()
          this.products = Array.isArray(payload.data)
            ? payload.data.filter(Boolean)
            : []
          this.totalItems = Number(payload.total || 0)
          this.filterProducts()
        } catch (err) {
          console.error(err)
          this.error = 'Could not load products from inventory.'
        } finally {
          this.loading = false
        }
      }
    },
    watch: {
      page() {
        this.fetchProducts()
      },
      showCart(val) {
        if (!val) {
          this.checkoutStep = 1
          this.checkoutMethod = ''
          this.paymentStatus = 'Select a method to continue.'
          this.invoice = null
          this.orderId = ''
          if (this.invoiceSocket) {
            this.invoiceSocket.close()
            this.invoiceSocket = null
          }
          this.checkoutDetails = {address: '', email: '', number: ''}
        }
      }
    },
    mounted() {
      if (this.shop.allow_bitcoin === undefined) this.shop.allow_bitcoin = true
      if (this.shop.allow_fiat === undefined) this.shop.allow_fiat = true
      this.fetchTags()
      this.fetchProducts()
    }
  })

  const ensureDependencies = async baseUrl => {
    const base = ensureNoTrailingSlash(baseUrl) || window.location.origin

    await Promise.all([
      loadStyleOnce(`${base}/static/vendor/quasar.css`),
      loadStyleOnce(`${base}/static/css/base.css`),
      loadStyleOnce(`${base}/webshop/static/css/public_page.css`),
      loadInlineStyleOnce(
        'webshop-material-icons-font',
        `@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url('${base}/static/fonts/material-icons-v50.woff2') format('woff2');
}
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'liga';
}`
      )
    ])

    if (!window.Vue || !window.Quasar) {
      await loadScriptOnce(`${base}/static/vendor/vue.global.prod.js`)
      await loadScriptOnce(`${base}/static/vendor/quasar.umd.prod.js`)
    }
  }

  const fetchPublicShop = async (shopId, baseUrl) => {
    const base = ensureNoTrailingSlash(baseUrl) || window.location.origin
    const response = await fetch(
      `${base}/webshop/api/v1/public/shop/${encodeURIComponent(shopId)}`
    )
    if (!response.ok) {
      throw new Error('Failed to load public shop data')
    }
    return response.json()
  }

  const applyShopTheme = (container, shop) => {
    const primary = shop?.primary_color || '#1c56ac'
    const secondary = shop?.secondary_color || '#0bb6d5'
    const background = shop?.background_color || '#f6f7f9'

    // Keep vars on both mount container and document root:
    // dialogs are teleported to <body>, not kept inside the container.
    container.style.setProperty('--q-primary', primary)
    container.style.setProperty('--q-secondary', secondary)
    container.style.setProperty('--shop-bg', background)
    document.documentElement.style.setProperty('--q-primary', primary)
    document.documentElement.style.setProperty('--q-secondary', secondary)
    document.documentElement.style.setProperty('--shop-bg', background)
  }

  const mount = async (target, options = {}) => {
    const container = resolveTarget(target)
    if (!container) {
      throw new Error('WebShop mount target not found')
    }

    const shopId = String(options.shopId || '').trim()
    if (!shopId) {
      throw new Error('shopId is required')
    }

    await ensureDependencies(options.baseUrl)

    const shop = options.shop || (await fetchPublicShop(shopId, options.baseUrl))
    const embedMode = new URLSearchParams(window.location.search).get('embed')
    const showInvoiceCopy =
      options.showInvoiceCopy === undefined
        ? embedMode !== 'iframe'
        : Boolean(options.showInvoiceCopy)
    const appOptions = createAppOptions({
      shop,
      shopId,
      inventoryId: options.inventoryId,
      placeholderImg:
        options.placeholderImg ||
        'https://dummyimage.com/900x700/f3f4f6/9ca3af.png&text=No+Image',
      ordersBaseUrl: options.ordersBaseUrl,
      showInvoiceCopy
    })

    const previous = mountedApps.get(container)
    if (previous) {
      previous.unmount()
      mountedApps.delete(container)
    }

    if (window.Quasar?.iconSet?.set && window.Quasar?.iconSet?.materialIcons) {
      window.Quasar.iconSet.set(window.Quasar.iconSet.materialIcons)
    }

    applyShopTheme(container, shop)
    const app = window.Vue.createApp(appOptions)
    app.use(window.Quasar, {plugins: {Notify: window.Quasar.Notify}})
    app.mount(container)
    mountedApps.set(container, app)
    return app
  }

  window.WebshopPublicPage = {
    mount
  }

  if (window.SHOP_ID && document.querySelector('#q-app')) {
    mount('#q-app', {
      shopId: window.SHOP_ID,
      shop: window.SHOP_DATA,
      placeholderImg: window.PLACEHOLDER_IMG
    }).catch(error => console.error(error))
  }
})()
