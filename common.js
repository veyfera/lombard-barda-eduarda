const LIMIT = 50
const PASSWD = "Valantis"

let password = generatePassword()
let g//rename, remove
let idk
let productTemplate
let productIds = []

function generatePassword() {
    const d = new Date()
    const timestamp = d.getFullYear() + `${d.getMonth()+1}`.padStart(2, "0") + d.getDate()
    let password = md5(`${PASSWD}_${timestamp}`)
    return password
}

async function queryApi(body)
{
    while(true){
        try {
            const data = await fetch("http://api.valantis.store:40000/",
                {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: {
                        "Content-type": "application/json",
                        "X-Auth": password
                    }
                })
            if(!data.ok)
                throw new Error(await data.text())
            const res = await data.json()
            console.log(res)
            return res.result
        }
        catch (error) {
            console.log(error)
        }
    }
}

async function fetchProducts() {
    // start loading
    const productsContainer = document.getElementById("main-products")
    productsContainer.childNodes.forEach((c) => c.hidden = true)
    const loading = document.getElementById("loading")
    loading.hidden = false
    //end loading
    let filtersForm = document.getElementById("filters-form")
    let filtersSelect = document.getElementById("filter-type")
    let fd = new FormData(filtersForm)
    let paramName = filtersSelect.value
    let paramValue = fd.get(paramName) !== 'null' ? parseFloat(fd.get(paramName)) || fd.get(paramName) : null
    
    console.log("fetching products with prametes: ", paramName, paramValue, typeof paramValue)
    let page = Number(g.get("page")) || 1//remove
    console.log("Fetching products page: ", page)
    if(!productIds.length) {
        //getIds
        if(filtersSelect.value) {
            productIds = await queryApi({
                "action": "filter",
                "params": {[paramName]: paramValue}
            })
        } else {
            productIds = await queryApi({
                "action": "get_ids",
            })
        }
        productIds = [... new Set(productIds)]// for preventing duplicates
        console.log("unique ids: ", productIds)
        let pageCount = Math.ceil(productIds.length / LIMIT)
        console.log("total pages: ", pageCount)
        //render pagination
        let pagination = document.getElementById("pagination")
        let newLinks = Array.from({length: pageCount}, (uselessValue, i) => {
            p = document.createElement("a")
            p.href = p.text = i+1
            return p.outerHTML
        })
        pagination.innerHTML = newLinks.join("\n")
    }
    let thisPageIds = productIds.slice((page-1)*LIMIT, page*LIMIT)
    console.log("thisPageIds: ", thisPageIds, (page-1)*LIMIT, page*LIMIT)
    //getDetatils
    let products = await queryApi({
        "action": "get_items",
        "params": {"ids": thisPageIds}
    })
    //remove duplicates
    products = products.filter((elem, index, arr) => arr.findIndex(e => e.id === elem.id) === index) 
    renderProducts(products.slice(0, LIMIT))
    loading.hidden = true
}

function prodTemplate(prod) {
    const productsContainer = document.getElementById("main-products")
    n = productTemplate
    n.hidden = false
    n = n.outerHTML
    for(key of Object.keys(prod)) {
        n = n.replace(`{${key}}`, prod[key])
    }

    return n
}

function renderProducts(products) {
    const productsContainer = document.getElementById("main-products")
    let prodElem = []
    for(prod of products) {
        let res = prodTemplate(prod)
        prodElem.push(res)
    }

    productsContainer.innerHTML = prodElem.join("\n")
}

function initPagination() {
    const pageNumber = document.getElementById("page-number")
    pageNumber.innerHTML = g.get("page") || 1
    const pagination = document.getElementById("pagination")

    pagination.addEventListener("click", (e) => {
        e.preventDefault()
        let page = e.srcElement.getAttribute("href")
        let same_page = page == g.get("page")
        if(e.srcElement.tagName !== "A" || same_page) return

        g.set("page", page)
        //update url
        const url = new URL(window.location)
        url.searchParams.set("page", page)
        window.history.pushState({}, '', url)
        pageNumber.innerHTML = page
        //fetch new items
    })
}

async function initFilters() {
    let filtersForm = document.getElementById("filters-form")
    let filtersSelect = document.getElementById("filter-type")
    let filters = document.querySelectorAll(".filter-types input, .filter-types select")

    //init from url params 
    for(f of filters) {
        if(g.has(f.name))
        {
            filtersSelect.value = f.name
            f.hidden = false
            f.value = g.get(f.name)
            break
        }
    }

    filtersSelect.addEventListener("change", (e) => {
        let activeFilter = e.target.value
        //filters.forEach((f) => f.name == activeFilter ? f.hidden = false : f.hidden = true )
        filters.forEach((f) => {
            if(f.name == activeFilter) {
                f.hidden = false
            } else {
                f.hidden = true
                f.value = ""
            }
        })
    })

    filtersForm.addEventListener("submit", (e) => {
        e.preventDefault()
        console.log("form submited: ", e)
        let fd = new FormData(filtersForm)
        let paramName = filtersSelect.value
        let paramValue = fd.get(paramName)
        productIds = []// we don't need old ones anymore

        //update url
        const url = new URL(window.location)
        url.search = ""
        if(e.submitter.id == "apply") {
            url.searchParams.set(paramName, paramValue)
        } else {
            filtersSelect.value = ""
            filters.forEach((f) => {
                f.hidden = true 
                f.value = ""
            })
        }
        window.history.pushState({}, '', url)
    })

    //get autocomplete values
    let datalists = Array.from(filtersForm.getElementsByTagName("datalist"))
    datalists.push(document.getElementById("brand"))

    for(d of datalists) {
        let brands = await queryApi({
            "action": "get_fields",
            "params": {"field": d.id}
        })
        brands = [... new Set(brands)]
        //format to options
        brands = brands.map((b) => {
            let o = document.createElement("option")
            o.value = b
            if(d.tagName == "SELECT")
                o.text = b
            return  o.outerHTML
        })
        d.innerHTML += brands.join("\n")
    }
}

window.navigation.addEventListener("navigate", (e) => {
    console.log("Location changed, ", e)

    //update current page text
    const pageNumber = document.getElementById("page-number")
    pageNumber.innerHTML = g.get("page") || 1
    fetchProducts()//updatePage
})

window.addEventListener("load", function() {
    //do vital first
    password = generatePassword()
    let params = new URLSearchParams(document.location.search)
    g = params
    productTemplate = document.getElementById("product-template")
    initFilters()
    initPagination()
    fetchProducts()//updatePage
})
