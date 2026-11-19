# Processus de GTM Engineering — CLAUDE.md

> **Objectif :** Ce fichier définit la méthodologie d'ingénierie Go-To-Market (GTM) pour B2B Boosted / UnlockClay.
> Claude Code doit utiliser ce document comme plan directeur (blueprint) lors de la construction de systèmes de prospection (outbound), de listes de prospects (leads), de pipelines d'enrichissement, d'outils de campagne et de workflows d'intégration (onboarding) client.
> **Rappel :** Toute la communication, l'analyse stratégique, la génération de messages (sauf demande contraire) et la documentation doivent se faire en **français**.

---

## Philosophie Centrale

Ne commence pas par les outils. Comprends d'abord le processus GTM, puis choisis les outils pour le servir.
La séquence est la suivante : **données → définition du marché → message (messaging) → test → passage à l'échelle (scale) → stack technique**.
Sauter des étapes gaspille le budget et "brûle" les marchés.

---

## Le Processus de GTM Engineering en 10 Étapes

### Étape 1 — Collecte des Données (Data Intake)

**Objectif :** Consolider toutes les données existantes avant de toucher au moindre nouvel outil.

Éléments à rassembler :
- Fichiers CSV existants contenant des données de prospects/entreprises
- Exports CRM (ou création d'un tableur maître s'il n'existe aucun CRM)
- Historique des campagnes d'e-mails et des messages passés
- Retours clients et notes de l'équipe Customer Success
- Notes d'appels commerciaux (ex. transcriptions Fireflies)
- Tout Google Doc, tableur ou liste de contacts qui traîne

Structure minimale viable d'un CRM (deux feuilles/onglets) :
- `company_data` — nom de l'entreprise, site web, secteur d'activité, chiffre d'affaires, stack technique, localisation
- `people_data` — prénom, nom, poste (title), e-mail, URL LinkedIn, entreprise

S'il n'y a pas de CRM, ce tableur EST le CRM. Construis-le ici en premier.

---

### Étape 2 — Définir le TAM & Segmenter les SAM

**Marché Total Adressable (TAM - Total Addressable Market) :** L'univers complet des clients potentiels.
**Marché Adressable Disponible (SAM - Serviceable Addressable Market) :** Les segments que tu peux réalistement atteindre et convertir.

#### ⚠️ Séparation Critique du Parcours

| Taille du TAM | Parcours | Approche |
|---|---|---|
| > 15 000 contacts | Parcours A | Automatisé, haut volume — suivre intégralement les Étapes 3 à 10 |
| < 15 000 contacts | Parcours B | Approche sur-mesure (High-touch), centrée sur l'humain — sauter les Étapes 5 à 10 ; voir la section "Exception Petit TAM" ci-dessous |

---

### Étape 3 — Segment → Persona → Problème

Pour chaque campagne, définir :
1. **Segment** — secteur d'activité ou niche (ex. SaaS en France, legal tech, acquisition de talents)
2. **Persona** — rôle de l'acheteur (ex. Directeur Commercial / Head of Sales, Fondateur, VP RevOps)
3. **Problème** — la douleur spécifique (pain point) de ce persona que ton offre résout

Règle : si le problème ne peut pas être énoncé en une seule phrase, le segment n'est pas assez précis.

---

### Étape 4 — Créer l'Angle (Cadre de Message / Messaging Framework)

Construire chaque message autour de : **Problème + Offre + Appel à l'action (CTA)**

Utiliser ces 7 principes de persuasion :

| Principe | Comment l'appliquer |
|---|---|
| **Donner d'abord (Give First)** | Commencer par une idée pertinente (insight), une correction ou un audit — gagner l'attention avant de demander |
| **Micro-Engagements** | Petit oui → grand oui (regarder 1 min → répondre → appel → contrat) |
| **Preuve Sociale (Social Proof)** | Utiliser des chiffres précis et des exemples du même secteur ("112 k$ générés pour X") |
| **Autorité** | Énoncer les résultats avec assurance ("Je l'ai déjà fait pour X") |
| **Rapport (Connexion)** | Adapter le ton, la longueur et le style à ton persona |
| **Rareté (Scarcity)** | Utiliser de vraies contraintes — capacité limitée, offres à durée limitée |
| **Identité Partagée** | "Tu es comme moi" — secteur, difficultés et valeurs partagés (le plus puissant) |

---

### Étape 5 — Sourcing d'Entreprises

**Objectif :** Construire une liste qualifiée de comptes cibles.

Tâches :
- Sourcer les entreprises correspondant à la définition du SAM
- Enrichir avec : tranche de revenus, stack technique, nombre d'employés, localisation, site web
- Qualifier en filtrant et excluant les entreprises qui ne répondent pas aux critères de l'ICP (Profil Client Idéal)

Outils : Clay (Claygent), Claude Code, Cursor

---

### Étape 6 — Sourcing de Contacts

**Objectif :** Trouver le bon acheteur au sein de chaque entreprise qualifiée.

Tâches :
- Identifier les décideurs par titre de poste / niveau hiérarchique (seniority)
- Enrichir avec une adresse e-mail validée et l'URL LinkedIn
- Qualifier selon l'autorité de prise de décision
- Repérer des accroches de personnalisation (actualités récentes, levées de fonds, signaux de recrutement, etc.)

Outils : Clay, Claude Code, Cursor

#### Les 5 Méthodes de Création de Listes de Prospects (Lead Lists)

| Méthode | Idéal pour | Outils |
|---|---|---|
| **Basée sur LinkedIn** | ~80 % des cas B2B — ciblage par rôle spécifique | Prospeo, AI Ark |
| **Similitude (Lookalike)** | ICP de niche sans filtres LinkedIn propres | Ocean.io, Disco, Company Enrich |
| **Scraping Google Maps** | Entreprises locales / sociétés de services | Serper, Openmart, Apify |
| **Scraping Sur-Mesure** | Annuaires, associations, bases de données gouvernementales | Cursor, Claude Code, Instant Data Scraper |
| **Agents IA** | Ultra-niche ou TAM inconnu | Exa, Parallel, Manis |

**Règle de décision :**
- Marché B2B large et clair → LinkedIn
- Niche mais flou → Lookalikes (Entreprises similaires)
- Entreprises locales → Google Maps
- Sources structurées cachées → Scraping sur-mesure
- Ultra-niche ou TAM inconnu → Agents IA

---

### Étape 7 — Adapter le Message

**Objectif :** Ajuster les modèles (templates) standardisés pour correspondre au contexte spécifique du segment/persona.

Règle : l'énoncé du problème central reste le même — seule son application change.
Ne réécris pas tout de zéro pour chaque contact. Personnalise à l'intérieur d'une structure éprouvée.

---

### Étape 8 — Test d'Adéquation Message-Marché (Message-Market Fit)

**Objectif :** Valider le message avant de passer à l'échelle (scaler).

Règles :
- Lancer des tests sur ~1 000 contacts par variante de campagne
- Tester une seule variable à la fois : objet/accroche (headline), CTA, angle de l'offre
- Ne pas lancer de campagnes complètes tant qu'au moins une variante ne montre pas un signal positif

---

### Étape 9 — Miser sur ce qui Fonctionne (Double Down)

Suivre ces trois indicateurs (metrics) pour évaluer la performance :

| Indicateur | Définition | Objectif de référence (Benchmark) |
|---|---|---|
| **Taux de Réponse (Reply Rate)** | % d'e-mails qui reçoivent une réponse (quelle qu'elle soit) | Viser > 1 % |
| **Ratio Contact-to-Lead** | Nombre de contacts nécessaires pour générer 1 réponse positive | Connaître sa base (ex. 1:300) |
| **Nouveaux E-mails Nets / Jour** | Premiers e-mails envoyés quotidiennement (hors relances/follow-ups) | Maximiser de façon constante |

**Actions :**
- Si un segment/message fonctionne → passe-le à l'échelle (scale)
- S'il ne résonne pas après 1 000 envois → coupe-le immédiatement

---

### Étape 10 — Stack Technique

**Ne définir la stack technique qu'après avoir complété les Étapes 1 à 9.**

Ordre de décision pour la stack :
1. Choisir le CRM / système de référence (le cœur du système)
2. Choisir le bon outil de liste de prospects selon l'ICP (méthodes de l'Étape 6)
3. Choisir la méthode de personnalisation des e-mails :
   - Projet IA / Custom GPT / Claude Code entraîné / Twain / Octave / Autobound
4. Connecter : outil de liste de prospects → enrichissement → CRM (via MCP, API ou webhooks)
5. Planifier la première campagne — puis lancer 5 campagnes, en isolant 1 variable par test
6. Flux : `Liste de prospects → Enrichir → Qualifier → Personnaliser → Lancer`

#### Clay vs Claude Code

| Dimension | Clay | Claude Code |
|---|---|---|
| Partage avec client/équipe | Facile — espace de travail partagé | Complexe (permissions locales vs globales) |
| Utilisation en solo | Fonctionne | Fonctionne mieux pour l'automatisation |
| Choix par défaut à court terme (2025–2026) | ✅ Recommandé | Pour des tâches spécifiques uniquement |
| Trajectoire à long terme | Efficace | Plus performant / efficient |

> **Recommandation :** Utiliser Claude Code pour des tâches isolées et spécifiques — sourcing de données, enrichissement, qualification, connexion d'outils externes. Utiliser Clay lorsque les workflows doivent être partagés avec des clients ou des coéquipiers.

---

## Exception Petit TAM (< 15 000 contacts)

L'automatisation à haut volume va brûler un petit marché. Passer plutôt à :

- **Enrichissement approfondi (Deep enrichment)** par compte (recherche manuelle ou semi-automatisée)
- **Vidéo enregistrée par un humain** (non générée par l'IA)
- **Notes vocales enregistrées par un humain** (pas d'appels robots IA)
- **Cadeaux attentionnés (Gifting)** pour les comptes à forte valeur
- **Présence multicanale** : LinkedIn + e-mail + événements + suivi des visiteurs du site web

### ❌ À éviter en 2026

Ces tactiques détruisent la confiance et ne doivent pas être utilisées :
- Prospection vidéo par IA
- Notes vocales par IA / appels automatisés (robo-calls)

---

## Ce que Claude Code Construit dans ce Système

Lorsqu'une tâche liée à ce processus GTM lui est confiée, Claude Code doit gérer :

1. La création de formulaires de collecte de données (data intake)
2. La connexion aux sources de données (Prospeo, Apify, etc.)
3. Les scripts de sourcing de listes de prospects
4. Les pipelines d'enrichissement de listes de prospects
5. La logique de qualification des listes de prospects
6. La génération de la personnalisation
7. Les workflows de création de campagnes
8. Les tableaux de bord (dashboards) de campagnes
9. L'analytique (analytics) des campagnes
10. L'automatisation de l'intégration (onboarding) client

---

## Contraintes Clés & Règles pour Claude Code

- Toujours confirmer quel parcours TAM s'applique (> ou < 15 000 contacts) avant de construire quoi que ce soit
- Ne jamais sauter les Étapes 1 à 4 lors de la conception d'un nouveau système de campagne pour un client
- Lors de la construction de pipelines d'enrichissement, toujours inclure un filtre de qualification — ne pas transmettre de données brutes en aval
- La personnalisation doit être construite sur un cadre de message éprouvé (Étape 4), et non générée à partir de zéro
- Tous les outils doivent exposer un point de connexion MCP, API ou webhook — aucun outil en "cul-de-sac" (dead-end)
- En cas de doute, utiliser Clay par défaut pour tout ce qui doit être partagé avec un client