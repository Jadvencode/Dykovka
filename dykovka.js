// ==========================================
// SUPABASE - PŘIPOJENÍ K DATABÁZI
// ==========================================

// Adresa našeho Supabase projektu
const SUPABASE_URL =
    "https://xcdutnnzecdsasfvwcgq.supabase.co";

// Veřejný klíč pro přístup z naší aplikace
const SUPABASE_KEY =
    "sb_publishable_D5qa7ZKPKqPdhtfvbEmWYA_ZuEoChqO";

// Vytvoříme spojení se Supabase
const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==========================================
// ZÁKLADNÍ NASTAVENÍ
// ==========================================

// Celková cena chaty
const cenaChaty = 4000;

// Seznam hráčů
let hraci = [];

// Zabrání několika kliknutím
// na tlačítko během ukládání
let prihlasovaniProbiha = false;


// ==========================================
// VÝPOČET CENY
// ==========================================

function prepocitejCeny() {

    // Spočítáme celkový počet dní
    // všech hráčů dohromady
    let celkemDnu = 0;

    for (let hrac of hraci) {

        celkemDnu += Number(hrac.pobyt);
    }


    // Pokud nemáme žádné dny,
    // není co počítat
    if (celkemDnu === 0) {
        return;
    }


    // Cena za jeden den
    const cenaZaDen =
        cenaChaty / celkemDnu;


    // Spočítáme cenu každého hráče
    for (let hrac of hraci) {

        hrac.cena =
            cenaZaDen * Number(hrac.pobyt);
    }


    console.log(
        "CENY PO VÝPOČTU:",
        hraci
    );
}


// ==========================================
// PŘIHLÁŠENÍ HRÁČE
// ==========================================

async function prihlasitHrace() {

    // Zabráníme několika kliknutím
    // během ukládání hráče
    if (prihlasovaniProbiha) {
        return;
    }

    prihlasovaniProbiha = true;


    try {

        // ==========================================
        // ZÍSKÁME ÚDAJE Z FORMULÁŘE
        // ==========================================

        const jmeno =
            document.getElementById("jmeno").value.trim();

        const pobyt =
            Number(
                document.getElementById("pobyt").value
            );

        const zprava =
            document.getElementById("zprava");


        // ==========================================
        // KONTROLA JMÉNA
        // ==========================================

        if (jmeno === "") {

            zprava.textContent =
                "Nejdřív zadej své jméno, hrdino!";

            return;
        }


        // ==========================================
        // NAČTEME AKTUÁLNÍ HRÁČE
        // ZE SUPABASE
        // ==========================================

        const { data, error } =
            await db
                .from("hraci")
                .select("*");


        if (error) {

            console.log(
                "CHYBA PŘI NAČÍTÁNÍ HRÁČŮ:",
                error
            );

            zprava.textContent =
                "Nepodařilo se načíst hráče.";

            return;
        }


        // Aktuální stav databáze
        // uložíme do našeho seznamu
        hraci = data;


        // ==========================================
        // ZKONTROLUJEME, JESTLI UŽ HRÁČ EXISTUJE
        // ==========================================

        const existuje = hraci.some(
            hrac =>
                hrac.jmeno.toLowerCase() ===
                jmeno.toLowerCase()
        );


        if (existuje) {

            zprava.textContent =
                "Hrdino, už jsi přihlášený!";

            return;
        }


        // ==========================================
        // VYTVOŘÍME NOVÉHO HRÁČE
        // ==========================================

        const novyHrac = {

            jmeno: jmeno,

            pobyt: pobyt,

            cena: 0
        };


        // ==========================================
        // PŘIDÁME HRÁČE DO SEZNAMU
        // ==========================================

        hraci.push(novyHrac);


        // ==========================================
        // SPOČÍTÁME NOVÉ CENY
        // ==========================================

        prepocitejCeny();


        console.log(
            "NOVÝ HRÁČ PŘED ULOŽENÍM:",
            novyHrac
        );

        console.log(
            "CENA PŘED ULOŽENÍM:",
            novyHrac.cena
        );


        // ==========================================
        // ULOŽÍME HRÁČE DO SUPABASE
        // ==========================================

        const ulozenyHrac =
            await ulozHraceDoDatabaze(novyHrac);


        // ==========================================
        // KONTROLA ULOŽENÍ
        // ==========================================

        if (!ulozenyHrac) {

            // Uložení se nepovedlo,
            // takže ho odstraníme z našeho seznamu
            hraci.pop();

            zprava.textContent =
                "Hráče se nepodařilo uložit.";

            return;
        }


        // ==========================================
        // ZNOVU NAČTEME HRÁČE ZE SUPABASE
        // ==========================================

        const { data: aktualniHraci, error: chybaNacteni } =
            await db
                .from("hraci")
                .select("*");


        if (chybaNacteni) {

            console.log(
                "CHYBA PŘI ZNOVUNAČTENÍ HRÁČŮ:",
                chybaNacteni
            );

            return;
        }


        // Aktualizujeme náš seznam
        hraci = aktualniHraci;


        // ==========================================
        // SPOČÍTÁME NOVÉ CENY
        // ==========================================

        prepocitejCeny();


        // ==========================================
        // ULOŽÍME NOVÉ CENY DO DATABÁZE
        // ==========================================

        await aktualizujCenyVDatabazi();


        // ==========================================
        // ZOBRAZÍME HRÁČE
        // ==========================================

        zobrazHrace();


        // ==========================================
        // NAJDEME NOVĚ PŘIHLÁŠENÉHO HRÁČE
        // ==========================================

        const aktualniHrac =
            hraci.find(
                hrac =>
                    hrac.jmeno.toLowerCase() ===
                    jmeno.toLowerCase()
            );


        // ==========================================
        // ZPRÁVA PRO HRÁČE
        // ==========================================

        zprava.textContent =
            "Vítej na Dýkovce, " +
            jmeno +
            "! Tvoje aktuální cena je " +
            Number(aktualniHrac.cena).toFixed(2) +
            " Kč.";

    }
    catch (error) {

        console.log(
            "CHYBA PŘI PŘIHLAŠOVÁNÍ:",
            error
        );
    }


    // Přihlášení je dokončeno
    prihlasovaniProbiha = false;
}


// ==========================================
// ZOBRAZENÍ HRÁČŮ
// ==========================================

function zobrazHrace() {

    // Najdeme seznam hráčů v HTML
    const seznam =
        document.getElementById("seznamHracu");


    // Vyčistíme starý seznam
    seznam.innerHTML = "";


    // Projdeme všechny hráče
    for (let hrac of hraci) {

        const polozka =
            document.createElement("li");


        // Zjistíme délku pobytu
        const delkaPobytu =
            Number(hrac.pobyt) === 1
                ? "1 den"
                : "celý víkend";


        // Vytvoříme text hráče
        polozka.textContent =
            hrac.jmeno +
            " – " +
            delkaPobytu +
            " – " +
            Number(hrac.cena).toFixed(2) +
            " Kč ";


        // ==========================================
        // TLAČÍTKO ODEBRAT
        // ==========================================

        const tlacitko =
            document.createElement("button");


        tlacitko.textContent =
            "Odebrat";


        // Co se stane po kliknutí
        tlacitko.onclick = async function() {

            // ==========================================
            // SMAŽEME HRÁČE ZE SUPABASE
            // ==========================================

            const { error } =
                await db
                    .from("hraci")
                    .delete()
                    .eq("id", hrac.id);


            // Pokud nastane chyba
            if (error) {

                console.log(
                    "CHYBA PŘI MAZÁNÍ:",
                    error
                );

                return;
            }


            // ==========================================
            // ODEBEREME HRÁČE Z NAŠEHO SEZNAMU
            // ==========================================

            const index =
                hraci.indexOf(hrac);


            hraci.splice(index, 1);


            // ==========================================
            // PŘEPOČÍTÁME CENY
            // ==========================================

            prepocitejCeny();


            // ==========================================
            // ULOŽÍME NOVÉ CENY DO DATABÁZE
            // ==========================================

            await aktualizujCenyVDatabazi();


            // ==========================================
            // ZNOVU ZOBRAZÍME HRÁČE
            // ==========================================

            zobrazHrace();
        };


        // Přidáme tlačítko k hráči
        polozka.appendChild(tlacitko);


        // Přidáme hráče do seznamu
        seznam.appendChild(polozka);
    }
}


// ==========================================
// NAČTENÍ HRÁČŮ ZE SUPABASE
// ==========================================

async function nactiHrace() {

    const { data, error } =
        await db
            .from("hraci")
            .select("*");


    // Pokud nastala chyba
    if (error) {

        console.log(
            "CHYBA PŘI NAČÍTÁNÍ:",
            error
        );

        return;
    }


    // Uložíme hráče do našeho seznamu
    hraci = data;


    console.log(
        "HRÁČI ZE SUPABASE:",
        hraci
    );


    // Spočítáme ceny
    prepocitejCeny();


    // Aktualizujeme ceny v databázi
    await aktualizujCenyVDatabazi();


    // Zobrazíme hráče
    zobrazHrace();
}


// ==========================================
// ULOŽENÍ HRÁČE DO SUPABASE
// ==========================================

async function ulozHraceDoDatabaze(hrac) {

    console.log(
        "UKLÁDÁM HRÁČE:",
        hrac
    );


    const { data, error } =
        await db
            .from("hraci")
            .insert([hrac])
            .select()
            .single();


    // Pokud nastala chyba
    if (error) {

        console.log(
            "CHYBA PŘI UKLÁDÁNÍ:",
            error
        );

        return null;
    }


    console.log(
        "HRÁČ ULOŽENÝ:",
        data
    );


    // Vrátíme hráče ze Supabase
    // včetně jeho ID
    return data;
}


// ==========================================
// AKTUALIZACE CEN V SUPABASE
// ==========================================

async function aktualizujCenyVDatabazi() {

    console.log(
        "AKTUALIZUJI CENY V DATABÁZI"
    );


    // Projdeme všechny hráče
    for (let hrac of hraci) {

        console.log(
            "AKTUALIZUJI:",
            hrac.jmeno,
            "ID:",
            hrac.id,
            "CENA:",
            hrac.cena
        );


        // Aktualizujeme cenu konkrétního hráče
        const { data, error } =
            await db
                .from("hraci")
                .update({
                    cena: Number(hrac.cena)
                })
                .eq("id", hrac.id)
                .select();


        // Kontrola chyby
        if (error) {

            console.log(
                "CHYBA PŘI AKTUALIZACI CENY:",
                error
            );

        } else {

            console.log(
                "CENA AKTUALIZOVÁNA:",
                data
            );
        }
    }
}


// ==========================================
// SPUŠTĚNÍ APLIKACE
// ==========================================

// Načteme hráče ze Supabase
nactiHrace();