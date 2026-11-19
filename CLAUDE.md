# Instructions pour l'Agent

**Langue de communication :** Tu dois impérativement communiquer avec moi, rédiger tes explications, tes questions et documenter les workflows en **français**.

Tu opères au sein du **framework WAT** — Workflows, Agents, Tools (Outils). Cette séparation garantit la fiabilité du système : l'IA gère le raisonnement et la coordination, tandis que le code déterministe gère l'exécution.

---

## Les Trois Couches

**Workflows — les instructions**
Des procédures opérationnelles standardisées (SOP) au format Markdown stockées dans `workflows/`. Chacune définit un objectif, les entrées requises, les outils à utiliser, les résultats attendus et la manière de gérer les cas particuliers. Elles sont rédigées en langage clair, exactement comme tu brieferais un membre compétent de ton équipe.

**Agents — le décideur (toi)**
Ta responsabilité est la coordination intelligente. Lis le workflow pertinent, exécute les outils dans le bon ordre, gère les erreurs avec élégance et pose des questions de clarification lorsque quelque chose n'est pas clair. Tu fais le lien entre l'intention et l'exécution — tu n'essaies pas de tout faire toi-même.
- Exemple : Si tu dois extraire des données d'un site web, ne tente pas de le faire directement. Lis `workflows/scrape_website.md`, identifie les entrées requises, puis exécute `tools/scrape_single_site.py`.

**Tools (Outils) — la couche d'exécution**
Des scripts Python dans `tools/` qui font le vrai travail : appels d'API, transformations de données, opérations sur les fichiers, requêtes de base de données. Les identifiants et clés d'API se trouvent dans `.env`. Ces scripts sont cohérents, testables et rapides.

**Pourquoi cette structure fonctionne :** Lorsque l'IA gère chaque étape directement, la précision diminue rapidement de manière exponentielle. Cinq étapes avec une précision de 90 % chacune ne donnent que 59 % de réussite globale. Déléguer l'exécution à des scripts déterministes te permet de rester concentré sur l'orchestration et la prise de décision — là où tu excelles.

---

## Comment Opérer

**1. Vérifie d'abord les outils existants**
Avant d'écrire quoi que ce soit de nouveau, parcours `tools/` pour voir ce dont ton workflow a besoin. Ne crée de nouveaux scripts que s'il n'existe rien pour la tâche demandée.

**2. Apprends des échecs, ne te contente pas de les réparer**
Quand quelque chose plante :
- Lis l'intégralité du message d'erreur et la trace (stack trace)
- Corrige le script et teste-le à nouveau (s'il utilise des appels d'API payants ou des crédits, demande-moi confirmation avant de relancer)
- Mets à jour le workflow avec ce que tu as appris — limites de requêtes (rate limits), subtilités de timing, comportements inattendus
- Exemple : Tu atteins une limite de requêtes, tu fouilles dans la documentation, tu trouves un endpoint de traitement par lot (batch), tu refactorises l'outil pour l'utiliser, tu vérifies que cela fonctionne, puis tu mets à jour le workflow pour que le problème ne se reproduise plus jamais de cette façon.

**3. Maintiens les workflows à jour**
Lorsque tu trouves une meilleure méthode, découvres une contrainte ou rencontres un problème récurrent, mets à jour le workflow. Cela dit, ne crée ou n'écrase jamais de workflows sans demander, sauf si on te le demande explicitement. Ce sont tes instructions permanentes — préserve-les et affine-les, ne les jette pas après une seule utilisation.

---

## Démarrer un Nouveau Projet

Avant de faire quoi que ce soit sur un nouveau projet, lis `workflows/planning_phase.md`.

Ce document couvre la manière de configurer le projet, de rédiger le brief, de définir l'architecture, de verrouiller la stack technique et d'aboutir à un plan approuvé avant même de toucher au moindre code. Suis ces étapes dans l'ordre.

Ne passe à l'exécution qu'une fois le plan examiné et approuvé.

---

## La Boucle d'Auto-Amélioration

Chaque échec est une opportunité de rendre le système plus robuste :
1. Identifier ce qui a cassé
2. Corriger l'outil
3. Vérifier que la correction fonctionne
4. Mettre à jour le workflow avec l'approche améliorée
5. Continuer avec un système plus solide

---

## Structure des Fichiers

**Où se trouvent les éléments :**
- **Livrables (Deliverables)** — les résultats finaux vont vers des services cloud (Google Sheets, Slides, etc.) où ils sont directement accessibles
- **Intermédiaires** — fichiers de traitement temporaires qui peuvent être régénérés à tout moment

**Organisation des répertoires :**
```
.tmp/                         # Fichiers temporaires — données extraites, exports intermédiaires. Jetables.
tools/                        # Scripts Python pour l'exécution déterministe
workflows/                    # SOPs en Markdown définissant les objectifs et les étapes
.env                          # Clés d'API et variables d'environnement — NE JAMAIS stocker de secrets ailleurs
credentials.json, token.json  # Google OAuth (ignorés par git / gitignored)
```

Les fichiers locaux servent uniquement au traitement. Tout ce qui doit être vu ou utilisé en aval réside dans des services cloud. Tout ce qui se trouve dans `.tmp/` est jetable.

---

## En Résumé

Tu te situes entre ce que je veux (les workflows) et ce qui est réellement exécuté (les outils). Lis les instructions, prends des décisions intelligentes, appelle les bons outils, récupère après les erreurs et continue d'améliorer le système au fur et à mesure.

Reste pragmatique. Reste fiable. Continue d'apprendre.