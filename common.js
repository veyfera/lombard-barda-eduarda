
function generatePassword() {
    const PASSWD = "Valantis"
    const d = new Date()
    const timestamp = d.getFullYear() + `${d.getMonth()+1}`.padStart(2, "0") + d.getDate()
    let password = md5(`${PASSWD}_${timestamp}`)
    return password
}

async function idk(password) {
    const body = {
        "action": "get_ids",
        "params": {"offset": 10, "limit": 3}
    }
    const data = await fetch("http://api.valantis.store:40000/",
        {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Content-type": "application/json",
                "X-Auth": password
            }
        }
    )
    const res = await data.json()
    console.log(res)
}

let pass = generatePassword()
idk(pass)
