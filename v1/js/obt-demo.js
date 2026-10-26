/* Au Domaine de Chasse : données de démonstration pour le panneau de réservation OBT.
 *
 * Le panneau est le vrai script de l'application (obt-gestion.com/blocks/obt-booking.js), le même que
 * sur le site de T'Nature. Le Domaine de Chasse n'a pas encore de compte dans l'application : ce fichier
 * répond à sa place, dans le navigateur, pour une adresse factice (DEMO_API). Rien n'est lu dans
 * l'application et rien n'y est écrit ; la demande finale n'est envoyée nulle part.
 *
 * Tarifs et règles : ceux du module SuperHote du site actuel (relevé du 25/10/2026) :
 * 133,40 € la nuit au plus bas, 180,55 € la nuit au tarif de base, ménage 50 €, taxe de séjour 1,67 €
 * par personne et par nuit, 2 nuits minimum, 8 voyageurs. La répartition des deux prix (semaine,
 * week-end, juillet et août) est une hypothèse de démonstration, à faire valider par Béatrice.
 * Les séjours déjà pris sont inventés, pour montrer le planning.
 */
(function () {
  "use strict";
  var DEMO_API = "https://demo-domaine-de-chasse.obt.invalid";
  var DEMO_ENVOI = "https://demo-domaine-de-chasse.obt.invalid/envoi";

  var JOUR = 86400000;
  var iso = function (d) { return d.toISOString().slice(0, 10); };
  var date = function (s) { return new Date(s + "T00:00:00Z"); };
  var auj = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  var plus = function (n) { return iso(new Date(auj.getTime() + n * JOUR)); };

  // Nuit du vendredi, du samedi, et toutes les nuits de juillet et d'août : tarif de base ; sinon le plus bas
  var PRIX_BAS = 13340, PRIX_BASE = 18055;
  var prixNuit = function (s) {
    var d = date(s), j = d.getUTCDay(), m = d.getUTCMonth() + 1;
    return j === 5 || j === 6 || m === 7 || m === 8 ? PRIX_BASE : PRIX_BAS;
  };

  var LOGEMENTS = [
    { id: "le-domaine", name: "Le Domaine de Chasse", kind: "gite", capacity: 8, minNights: 2, contains: [],
      note: "240 m², 4 chambres, 5 lits, balnéo, salle de loisirs de 60 m²", image: "images/gite/salle-loisirs.jpg" },
  ];

  // Quelques séjours inventés autour d'aujourd'hui, avec le jour de battement entre deux locations
  var OCCUPE = { "le-domaine": [
    { start: plus(4), end: plus(6) }, { start: plus(11), end: plus(13) }, { start: plus(18), end: plus(25) },
    { start: plus(32), end: plus(34) }, { start: plus(46), end: plus(48) },
  ] };

  var OPTIONS = [
    { id: "taxe", name: "Taxe de séjour", priceCents: 167, unit: "personne_nuit", mandatory: true },
    { id: "menage", name: "Ménage de fin de séjour", priceCents: 5000, unit: "sejour", mandatory: true },
    { id: "linge", name: "Linge de lit et serviettes fournis", priceCents: 0, unit: "sejour", included: true },
    { id: "the-cafe", name: "Thé et café à l’arrivée", priceCents: 0, unit: "sejour", included: true },
  ].map(function (o) {
    return { id: o.id, name: o.name, priceCents: o.priceCents, unit: o.unit, logementIds: [], appliesTo: "all",
      minGuests: null, minNights: null, included: !!o.included, mandatory: !!o.mandatory, maxGuests: null, maxNights: null,
      periodStart: null, periodEnd: null, includedGuests: null, adultsOnly: false };
  });

  var CONDITIONS = [
    { id: "arrivee", title: "Arrivée et départ", body: "Arrivée autonome à partir de 18 h, grâce à une boîte à clés sécurisée. Départ avant 10 h.\nBesoin d’un autre horaire ? Dites-le dans votre demande, on s’arrange souvent." },
    { id: "caution", title: "Caution", body: "Une caution de 500 € est demandée avant l’arrivée, par empreinte bancaire. Elle n’est pas débitée et elle est libérée dans les 7 jours qui suivent le départ si aucun dommage n’est constaté." },
    { id: "regles", title: "La maison", body: "Le gîte est non-fumeur. Les animaux ne sont pas admis. Merci de respecter le calme de la campagne et de ne pas emprunter l’accès situé à l’arrière du gîte, qui mène à l’exploitation agricole." },
  ];
  var QUESTIONS = [
    { id: "heure", label: "À quelle heure pensez-vous arriver ?" },
    { id: "motif", label: "Vous venez en famille, entre amis ou pour le travail ?" },
    { id: "facture", label: "Avez-vous besoin d’une facture au nom d’une entreprise ?" },
  ];

  var nuits = function (a, b) { return Math.round((date(b) - date(a)) / JOUR); };
  var chevauche = function (a, b, r) { return a < r.end && r.start < b; };
  var byId = function (id) { return LOGEMENTS.filter(function (l) { return l.id === id; })[0]; };
  var libre = function (l, a, b) { return !OCCUPE[l.id].some(function (r) { return chevauche(a, b, r); }); };

  function prixNuits(l, a, b) {
    var t = [];
    for (var i = 0; i < nuits(a, b); i++) {
      var d = iso(new Date(date(a).getTime() + i * JOUR));
      t.push({ date: d, priceCents: prixNuit(d) });
    }
    return t;
  }
  var somme = function (t) { return t.reduce(function (s, x) { return s + x.priceCents; }, 0); };

  function planning() {
    return { hidden: false, today: iso(auj), privacyUrl: null, questions: QUESTIONS, conditions: CONDITIONS, options: OPTIONS,
      logements: LOGEMENTS.map(function (l) {
        return { id: l.id, name: l.name, kind: l.kind, capacity: l.capacity, note: l.note, image: new URL(l.image, location.href).href,
          minNights: l.minNights, minStays: [], contains: l.contains, occupied: OCCUPE[l.id] };
      }) };
  }

  function disponibilites(p) {
    var a = p.get("start"), b = p.get("end"), g = +p.get("guests") || 1, n = nuits(a, b);
    return { hidden: false, nights: n, guests: g, logements: LOGEMENTS.map(function (l) {
      var ok = libre(l, a, b), assez = n >= l.minNights;
      return { id: l.id, name: l.name, kind: l.kind, capacity: l.capacity, note: l.note, image: new URL(l.image, location.href).href,
        fits: g <= l.capacity, minNights: l.minNights, available: ok && assez,
        reason: !ok ? "occupe" : !assez ? "nuits_minimum" : g > l.capacity ? "places" : null,
        accommodationCents: ok && assez ? somme(prixNuits(l, a, b)) : null };
    }) };
  }

  function devis(p) {
    var ids = (p.get("logement") || "").split(",").filter(Boolean), a = p.get("start"), b = p.get("end");
    var g = +p.get("guests") || 1, enfants = +p.get("children") || 0, n = nuits(a, b);
    var choisis = ids.map(byId).filter(Boolean);
    var dispo = choisis.length > 0 && choisis.every(function (l) { return libre(l, a, b) && n >= l.minNights; });
    var places = choisis.reduce(function (s, l) { return s + l.capacity; }, 0);
    var lignes = [], nuitees = {};
    choisis.forEach(function (l) {
      var t = prixNuits(l, a, b);
      t.forEach(function (x) { nuitees[x.date] = (nuitees[x.date] || 0) + x.priceCents; });
      lignes.push({ id: l.id, name: l.name, accommodationCents: somme(t) });
    });
    var hebergement = lignes.reduce(function (s, x) { return s + x.accommodationCents; }, 0);
    var voulues = (p.get("options") || "").split(",").filter(Boolean);
    var extras = OPTIONS.filter(function (o) { return o.mandatory || o.included || voulues.indexOf(o.id) >= 0; }).map(function (o) {
      var q = o.unit === "sejour" ? 1 : o.unit === "personne" ? g : o.unit === "personne_nuit" ? g * n : n;
      var e = { id: o.id, name: o.name, unit: o.unit, quantity: q, unitPriceCents: o.priceCents, totalCents: o.priceCents * q };
      if (o.mandatory) e.mandatory = true;
      if (o.included) e.included = true;
      return e;
    });
    return { hidden: false, available: dispo && g <= places, nights: n, guests: g, children: enfants,
      minNights: Math.max.apply(null, choisis.map(function (l) { return l.minNights; }).concat(1)), capacity: places,
      nightly: Object.keys(nuitees).sort().map(function (d) { return { date: d, priceCents: nuitees[d] }; }),
      lines: lignes, accommodationCents: hebergement, extras: extras,
      totalCents: hebergement + extras.reduce(function (s, e) { return s + e.totalCents; }, 0) };
  }

  var repondre = function (corps) {
    return Promise.resolve(new Response(JSON.stringify(corps), { status: 200, headers: { "Content-Type": "application/json" } }));
  };
  var vraiFetch = window.fetch.bind(window);
  window.fetch = function (entree, init) {
    var url = typeof entree === "string" ? entree : entree && entree.url;
    if (!url || url.indexOf(DEMO_API) !== 0) return vraiFetch(entree, init);
    var u = new URL(url);
    // Démonstration : la demande et l'e-mail ne partent nulle part, le visiteur voit simplement « Merci »
    if (url.indexOf(DEMO_ENVOI) === 0 || /\/requests$/.test(u.pathname)) return repondre({ success: true, demo: true });
    if (/\/image\//.test(u.pathname)) return vraiFetch(entree, init);
    if (/\/planning$/.test(u.pathname)) return repondre(planning());
    if (/\/availability$/.test(u.pathname)) return repondre(disponibilites(u.searchParams));
    if (/\/quote$/.test(u.pathname)) return repondre(devis(u.searchParams));
    return Promise.resolve(new Response("{}", { status: 404 }));
  };
})();
