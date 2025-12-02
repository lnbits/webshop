window.app = Vue.createApp({
  el: '#vue',
  mixins: [windowMixin],
  delimiters: ['${', '}'],
  data: function () {
    return {
      currencyOptions: ['sat'],
      defaultInventoryId: null,
      defaultInventoryCurrency: null,
      inventoryError: '',
      inventoryTagOptions: [],
      settingsFormDialog: {
        show: false,
        data: {}
      },

      shopFormDialog: {
        show: false,
        data: {
          name: null,
          description: null,
          primary_color: null,
          secondary_color: null,
          background_color: '#f6f7f9',
          inventory_id: null,
          currency: 'sat',
          allowed_tags: [],
          wallet: null,
          allow_bitcoin: true,
          allow_fiat: true
        }
      },
      shopList: [],
      shopTable: {
        search: '',
        loading: false,
        columns: [
          {
            name: 'name',
            align: 'left',
            label: 'Name',
            field: 'name',
            sortable: true
          },
          {
            name: 'description',
            align: 'left',
            label: 'Description',
            field: 'description',
            sortable: true
          },
          {
            name: 'primary_color',
            align: 'left',
            label: 'Primary Color',
            field: 'primary_color',
            sortable: true
          },
          {
            name: 'secondary_color',
            align: 'left',
            label: 'Secondary Color',
            field: 'secondary_color',
            sortable: true
          },
          {
            name: 'inventory_id',
            align: 'left',
            label: 'Inventory',
            field: 'inventory_id',
            sortable: true
          },
          {
            name: 'currency',
            align: 'left',
            label: 'Currency',
            field: 'currency',
            sortable: true
          },
          {
            name: 'wallet',
            align: 'left',
            label: 'Wallet',
            field: 'wallet',
            sortable: true
          },
          {
            name: 'updated_at',
            align: 'left',
            label: 'Updated At',
            field: 'updated_at',
            sortable: true
          },
          {name: 'id', align: 'left', label: 'ID', field: 'id', sortable: true}
        ],
        pagination: {
          sortBy: 'updated_at',
          rowsPerPage: 10,
          page: 1,
          descending: true,
          rowsNumber: 10
        }
      },

      clientDataList: [],
      clientDataTable: {
        search: '',
        loading: false,
        columns: [
          {
            name: 'product',
            align: 'left',
            label: 'Product',
            field: 'product',
            sortable: true
          },
          {
            name: 'quantity',
            align: 'right',
            label: 'Quantity',
            field: 'quantity',
            sortable: true
          },
          {
            name: 'address',
            align: 'left',
            label: 'Address',
            field: 'address',
            sortable: true
          },
          {
            name: 'email',
            align: 'left',
            label: 'Email',
            field: 'email',
            sortable: true
          },
          {
            name: 'number',
            align: 'left',
            label: 'Phone',
            field: 'number',
            sortable: true
          },
          {
            name: 'paid',
            align: 'center',
            label: 'Paid',
            field: 'paid',
            sortable: true
          },
          {
            name: 'shipped',
            align: 'center',
            label: 'Shipped',
            field: 'shipped',
            sortable: true
          },
          {
            name: 'updated_at',
            align: 'left',
            label: 'Updated At',
            field: 'updated_at',
            sortable: true
          },
          {name: 'id', align: 'left', label: 'ID', field: 'id', sortable: true}
        ],
        pagination: {
          sortBy: 'updated_at',
          rowsPerPage: 10,
          page: 1,
          descending: true,
          rowsNumber: 10
        }
      },
      clientDataDialog: {
        show: false,
        data: {},
        items: [],
        itemsLoading: false
      }
    }
  },
  watch: {
    'shopTable.search': {
      handler() {
        const props = {}
        if (this.shopTable.search) {
          props['search'] = this.shopTable.search
        }
        this.getShop()
      }
    },
    'clientDataTable.search': {
      handler() {
        const props = {}
        if (this.clientDataTable.search) {
          props['search'] = this.clientDataTable.search
        }
        this.getClientData()
      }
    }
  },

  methods: {
    formatFromNow(val) {
      try {
        if (!val) return ''
        const d = new Date(val)
        if (window.Quasar && Quasar.date) {
          return Quasar.date.formatDate(d, 'YYYY-MM-DD HH:mm')
        }
        return d.toLocaleString()
      } catch (e) {
        return val || ''
      }
    },
    dateFromNow(val) {
      return this.formatFromNow(val)
    },

    //////////////// Shop ////////////////////////
    async showNewShopForm() {
      this.shopFormDialog.data = {
        name: null,
        description: null,
        primary_color: null,
        secondary_color: null,
        background_color: '#f6f7f9',
        inventory_id: this.defaultInventoryId,
        currency: this.defaultInventoryCurrency || 'sat',
        allowed_tags: [...this.inventoryTagOptions],
        wallet: this.g?.user?.wallets?.[0]?.id || null,
        allow_bitcoin: true,
        allow_fiat: true
      }
      this.shopFormDialog.show = true
    },
    async showEditShopForm(data) {
      this.shopFormDialog.data = {
        allow_bitcoin: true,
        allow_fiat: true,
        ...data
      }
      if (!this.shopFormDialog.data.inventory_id && this.defaultInventoryId) {
        this.shopFormDialog.data.inventory_id = this.defaultInventoryId
      }
      if (!this.shopFormDialog.data.currency && this.defaultInventoryCurrency) {
        this.shopFormDialog.data.currency = this.defaultInventoryCurrency
      }
      if (!Array.isArray(this.shopFormDialog.data.allowed_tags)) {
        this.shopFormDialog.data.allowed_tags = this.shopFormDialog.data
          .allowed_tags
          ? this.shopFormDialog.data.allowed_tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : [...this.inventoryTagOptions]
      }
      this.shopFormDialog.show = true
    },
    async saveShop() {
      try {
        const data = {extra: {}, ...this.shopFormDialog.data}
        if (!data.inventory_id && this.defaultInventoryId) {
          data.inventory_id = this.defaultInventoryId
        }
        if (!data.currency && this.defaultInventoryCurrency) {
          data.currency = this.defaultInventoryCurrency
        }
        if (Array.isArray(data.allowed_tags)) {
          data.allowed_tags = data.allowed_tags.join(',')
        }
        const method = data.id ? 'PUT' : 'POST'
        const entry = data.id ? `/${data.id}` : ''
        await LNbits.api.request(
          method,
          '/webshop/api/v1/shop' + entry,
          null,
          data
        )
        this.getShop()
        this.shopFormDialog.show = false
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },

    async getShop(props) {
      try {
        this.shopTable.loading = true
        const params = LNbits.utils.prepareFilterQuery(this.shopTable, props)
        const {data} = await LNbits.api.request(
          'GET',
          `/webshop/api/v1/shop/paginated?${params}`,
          null
        )
        this.shopList = data.data
        this.shopTable.pagination.rowsNumber = data.total
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      } finally {
        this.shopTable.loading = false
      }
    },
    async deleteShop(shopId) {
      await LNbits.utils
        .confirmDialog('Are you sure you want to delete this Shop?')
        .onOk(async () => {
          try {
            await LNbits.api.request(
              'DELETE',
              '/webshop/api/v1/shop/' + shopId,
              null
            )
            await this.getShop()
          } catch (error) {
            LNbits.utils.notifyApiError(error)
          }
        })
    },
    async exportShopCSV() {
      await LNbits.utils.exportCSV(
        this.shopTable.columns,
        this.shopList,
        'shop_' + new Date().toISOString().slice(0, 10) + '.csv'
      )
    },
    copyIframe(row) {
      const origin = window.location.origin
      const src = `${origin}/webshop/${row.id}`
      const snippet = `<iframe src="${src}" width="100%" height="900" style="border:0; border-radius:12px;"></iframe>`
      LNbits.utils.copyText(snippet)
      LNbits.utils.notifySuccess('Iframe embed copied')
    },
    async fetchInventoryId() {
      try {
        const {data} = await LNbits.api.request(
          'GET',
          '/inventory/api/v1',
          null
        )
        this.defaultInventoryId = data?.id || null
        this.defaultInventoryCurrency = data?.currency || 'sat'
        this.inventoryTagOptions = Array.isArray(data?.tags)
          ? data.tags.filter(Boolean)
          : String(data?.tags || '')
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
        if (!this.inventoryTagOptions.length) {
          this.inventoryTagOptions = []
        }
        this.inventoryError = ''
      } catch (error) {
        console.warn('Unable to fetch inventory id', error)
        this.inventoryError =
          'First create an inventory in the Inventory extension.'
        this.defaultInventoryId = null
        this.defaultInventoryCurrency = null
        this.inventoryTagOptions = []
      }
    },

    //////////////// Client Data (Orders) ////////////////////////
    async getClientData(props) {
      try {
        this.clientDataTable.loading = true
        const params = LNbits.utils.prepareFilterQuery(
          this.clientDataTable,
          props
        )
        const {data} = await LNbits.api.request(
          'GET',
          `/webshop/api/v1/client_data/paginated?${params}`,
          null
        )
        this.clientDataList = data.data
        this.clientDataTable.pagination.rowsNumber = data.total
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      } finally {
        this.clientDataTable.loading = false
      }
    },
    async exportClientDataCSV() {
      await LNbits.utils.exportCSV(
        this.clientDataTable.columns,
        this.clientDataList,
        'orders_' + new Date().toISOString().slice(0, 10) + '.csv'
      )
    },
    async toggleShipped(row) {
      const payload = {
        product: row.product,
        quantity: row.quantity,
        address: row.address,
        email: row.email,
        number: row.number,
        shipped: !row.shipped
      }
      try {
        await LNbits.api.request(
          'PUT',
          `/webshop/api/v1/client_data/${row.id}`,
          null,
          payload
        )
        this.getClientData()
      } catch (error) {
        LNbits.utils.notifyApiError(error)
      }
    },
    showOrderDetails(row) {
      this.clientDataDialog.data = {...row}
      this.clientDataDialog.items = []
      this.clientDataDialog.itemsLoading = true
      this.clientDataDialog.show = true
      this.fetchOrderItems(row.id)
    },
    showOrderRow(_, row) {
      this.showOrderDetails(row)
    },
    async fetchOrderItems(id) {
      try {
        // Try to use items stored on the row first
        const row = this.clientDataList.find(r => r.id === id)
        if (row && row.items) {
          try {
            this.clientDataDialog.items = JSON.parse(row.items) || []
            return
          } catch (e) {
            /* fall through to API */
          }
        }
        const {data} = await LNbits.api.request(
          'GET',
          `/webshop/api/v1/client_data/${id}/items`,
          null
        )
        this.clientDataDialog.items = data || []
      } catch (error) {
        console.warn('Unable to load order items', error)
        this.clientDataDialog.items = []
      } finally {
        this.clientDataDialog.itemsLoading = false
      }
    }
  },
  async created() {
    await this.fetchInventoryId()
    this.getShop()
    this.getClientData()
  }
})
