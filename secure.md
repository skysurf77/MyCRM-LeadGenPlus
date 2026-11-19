# CLAUDE.md — Compétences du Projet & Permissions

**Rappel :** Tous les rapports d'audit, d'assurance qualité (QA) et de sécurité doivent m'être présentés en **français**.

---

## Permissions (Liste d'autorisations / Allow List)

Les commandes shell suivantes peuvent être exécutées **sans confirmation de l'utilisateur** :

```json
{
  "permissions": {
    "allow": [
      "cat",
      "touch",
      "mkdir",
      "ls",
      "pwd",
      "echo"
    ],
    "deny": [
      "rm -rf",
      "rm -fdr",
      "rm -fr",
      "rmdir"
    ]
  }
}
```

> **Règle :** Les opérations de lecture et de création (`cat`, `touch`, `mkdir`) sont approuvées automatiquement.  
> Les opérations de suppression destructrices (`rm -rf`, `rm -fdr`) nécessitent **toujours** une confirmation explicite de l'utilisateur avant leur exécution.

---

## Compétence 1 (Skill 1) — Assurance Qualité (QA) & Revue de Code

### Objectif
S'assurer que la base de code (codebase) est fonctionnellement complète, propre et exempte d'erreurs avant la mise en production.

### Liste de contrôle (Checklist)

#### Exhaustivité Fonctionnelle
- [ ] Toutes les fonctionnalités prévues sont implémentées et fonctionnent comme attendu
- [ ] Aucune fonction fictive (placeholder ou stub) n'est laissée dans le code de production
- [ ] Tous les parcours utilisateurs (user flows) ont été testés de bout en bout (end-to-end)

#### Qualité du Code
- [ ] Aucune faute de frappe dans les noms de variables, noms de fonctions, commentaires ou textes de l'interface utilisateur (UI)
- [ ] Aucun caractère parasite (ex. tirets cadratins `—` utilisés à la place de traits d'union `-` dans le code)
- [ ] Conventions de nommage cohérentes utilisées partout (camelCase / snake_case selon le cas)
- [ ] Aucun code mort ou mis en commentaire laissé dans la base de code
- [ ] Aucun `console.log` ou instruction d'affichage de débogage (print) dans les fichiers de production

#### Exposition des Données
- [ ] Aucune donnée sensible (clés d'API, jetons/tokens, secrets, mots de passe) codée en dur (hardcoded) où que ce soit dans le code
- [ ] Aucune URL interne, identifiant de test ou identifiant privé exposé dans le code côté client
- [ ] Aucune donnée personnelle (PII - Personally Identifiable Information) enregistrée dans les logs ou stockée de manière non sécurisée

#### Gestion des Erreurs
- [ ] Tous les appels d'API sont enveloppés dans des blocs `try/catch`
- [ ] Les messages d'erreur affichés à l'utilisateur sont génériques (aucune trace de pile / stack trace ou détail interne exposé)
- [ ] Les cas particuliers (entrées vides, valeurs nulles, échecs de requêtes) sont gérés avec élégance

#### Dépendances
- [ ] Tous les paquets (packages) importés sont réellement utilisés
- [ ] Aucun paquet présentant des vulnérabilités connues (vérifier avec `npm audit` ou équivalent)
- [ ] Le fichier `package.json` / `requirements.txt` est à jour et exact

### Comment exécuter cette compétence
> Demander à Claude :  
> *"Exécute la compétence Assurance Qualité sur ce code. Vérifie tous les fichiers par rapport à la checklist QA et signale les problèmes par catégorie."*

---

## Compétence 2 (Skill 2) — Sécurité & Intégrité

### Objectif
Protéger l'application et ses utilisateurs contre les abus, les fuites de données et les accès non autorisés.

### Liste de contrôle (Checklist)

#### Gestion des Secrets
- [ ] **Aucune clé d'API dans le code source** — tous les secrets doivent résider dans un fichier `.env`
- [ ] Le fichier `.env` est listé dans `.gitignore` et n'est jamais envoyé (commit) sur le gestionnaire de versions
- [ ] Un fichier `.env.example` existe avec des valeurs fictives (aucun vrai secret)
- [ ] Les variables d'environnement sont chargées correctement à l'exécution (ex. `dotenv` / variables d'OS)

#### Limitation de Débit (Rate Limiting)
- [ ] La limitation de débit est activée sur tous les points de terminaison (endpoints) publics, en particulier les interfaces d'IA/chat
- [ ] Base recommandée : **max 10 à 50 messages par session de 10 minutes** par utilisateur/IP
- [ ] Les en-têtes (headers) de limite de débit sont renvoyés dans les réponses (`X-RateLimit-Limit`, `X-RateLimit-Remaining`)
- [ ] Le dépassement de la limite renvoie une réponse `429 Too Many Requests` (et non un plantage)
- [ ] Les limites sont configurables via des variables d'environnement (non codées en dur)

#### Prévention des DDoS & Abus
- [ ] Le trafic de robots/automatisé est atténué via une limitation de débit basée sur la session ou l'IP
- [ ] Aucune boucle infinie ou appel récursif non borné qui pourrait être exploité pour épuiser les ressources
- [ ] Les points de terminaison d'envoi de fichiers (le cas échéant) imposent des limites de taille et une validation du type de fichier

#### Authentification & Autorisation
- [ ] Les routes authentifiées sont correctement protégées — aucun contournement possible via la manipulation d'URL
- [ ] Les jetons (tokens) / sessions expirent après une période d'inactivité raisonnable
- [ ] Les routes d'administration ou internes ne sont pas accessibles publiquement

#### Validation des Entrées
- [ ] Toutes les entrées utilisateur sont validées et nettoyées (sanitised) avant utilisation
- [ ] Les requêtes SQL (le cas échéant) utilisent des requêtes paramétrées — aucune concaténation de chaînes de caractères
- [ ] Aucun `eval()` ou exécution de code dynamique sur des entrées fournies par l'utilisateur

#### En-têtes (Headers) & Transport
- [ ] HTTPS imposé en production (pas de HTTP en texte clair)
- [ ] En-têtes de sécurité définis : `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] La politique CORS est restrictive — seules les origines de confiance sont autorisées

### Comment exécuter cette compétence
> Demander à Claude :  
> *"Exécute la compétence Sécurité & Intégrité sur ce projet. Vérifie tous les fichiers pour détecter les secrets exposés, l'absence de rate limiting et les failles de sécurité. Signale les résultats par ordre de gravité."*

---

## Référence Rapide — Phrases de Déclenchement (Prompts)

| Objectif | Quoi dire à Claude |
|---|---|
| Audit QA complet | `"Lance la compétence QA — vérifie les fautes de frappe, le code mort et l'exposition des données"` |
| Audit de sécurité | `"Lance la compétence Sécurité — vérifie les clés exposées, le rate limiting et la validation des entrées"` |
| Vérification avant mise en prod | `"Lance les compétences QA et Sécurité. Donne-moi un rapport de préparation avant mise en production."` |
| Vérification des permissions | `"Vérifie la liste d'autorisations (allow list) avant d'exécuter des commandes destructrices"` |

---

> **Note :** Étant donné que les réponses des modèles d'IA varient légèrement d'une exécution à l'autre, concentrez-vous sur le fait de savoir si les *problèmes identifiés* sont corrects — et non sur la correspondance exacte du vocabulaire avec un rapport précédent. Les éléments de la liste de contrôle ci-dessus constituent la source de vérité.