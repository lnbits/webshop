;(() => {
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

  const isBase64String = value =>
    typeof value === 'string' &&
    value.includes('data:') &&
    value.includes('base64')

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

  const app = Vue.createApp({
    data() {
      return {
        shop: SHOP_DATA || {},
        shopId: SHOP_ID,
        inventoryId:
          (SHOP_DATA && SHOP_DATA.inventory_id) ||
          new URLSearchParams(window.location.search).get('inventory_id') ||
          '',
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
        ordersBaseUrl: window.location.origin,
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
        if (!this.invoice || !this.invoice.request || this.invoice.paid)
          return ''
        return `/api/v1/qrcode?data=${encodeURIComponent(this.invoice.request)}`
      },
      invoicePaid() {
        return Boolean(this.invoice && this.invoice.paid)
      },
      invoiceText() {
        return this.invoice?.request || ''
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
        if (!images.length) return PLACEHOLDER_IMG
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
        this.modalImages = images.length ? images : [PLACEHOLDER_IMG]
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
          const fiatLink = data.fiat_payment_request || data.payment_request
          if (data.payment_request || data.fiat_payment_request) {
            this.invoice = {
              request: data.payment_request,
              hash: data.payment_hash,
              paid: false
            }
            this.startInvoiceWatcher()
            if (isFiat) {
              const checkoutUrl = fiatLink
              if (checkoutUrl) {
                window.open(checkoutUrl, '_blank', 'noopener')
                this.paymentStatus = 'Redirected to payment provider...'
              } else {
                this.paymentStatus = 'Missing fiat checkout link.'
              }
            }
          }
          this.paymentStatus = 'Awaiting payment...'
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
      copyInvoice() {
        if (!this.invoiceText) return
        navigator.clipboard.writeText(this.invoiceText).then(() => {
          Quasar.Notify.create({type: 'positive', message: 'Invoice copied'})
        })
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

  if (Quasar?.iconSet?.set && Quasar?.iconSet?.materialIcons) {
    Quasar.iconSet.set(Quasar.iconSet.materialIcons)
  }
  app.use(Quasar, {plugins: {Notify: Quasar.Notify}})
  app.mount('#q-app')
})()
