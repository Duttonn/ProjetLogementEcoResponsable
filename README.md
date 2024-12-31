# Three.js + FastAPI Vite Project: Logement Éco-Responsable

Bienvenue dans le projet **Logement Éco-Responsable** !\
Ce projet propose une application web interactive intégrant **Three.js** pour la visualisation 3D, javascript et html/CSS pour le site et **FastAPI** pour le backend, dans le cadre du TP IoT "Logement Éco-Responsable". L'objectif est de permettre aux utilisateurs de surveiller et réduire leur consommation énergétique à l'aide de capteurs connectés.

---

## Table des Matières

- [Présentation du Projet](#présentation-du-projet)
- [Prérequis](#prérequis)
- [Instructions de Setup](#instructions-de-setup)
- [Windows](#windows)
- [Linux/Mac](#linuxmac)
- [Lancement du Projet](#lancement-du-projet)
- [Annexe](#annexe)

---

## Présentation du Projet

Le projet **Logement Éco-Responsable** vise à offrir une application clé en main permettant aux particuliers de suivre et gérer leur consommation d’énergie, d’eau et autres ressources.\
Grâce à l'intégration de capteurs IoT (température, luminosité, eau, etc.), les utilisateurs pourront visualiser leurs consommations et programmer des actions automatiques (comme fermer les volets ou couper l'électricité) en fonction des données reçues.

### Technologies Utilisées

- **Frontend** : Three.js, Vite, HTML/CSS, javascript
- **Backend** : FastAPI
- **Base de Données** : SQLite3
- **API Externes** : Données météorologiques (Open météo), factures (Google Charts)

---

## Prérequis

Assurez-vous d'avoir les éléments suivants installés :

- **Node.js** (v16+)
- **npm** (v8+)
- **Python 3.8+**

---

## Instructions de Setup

### 1. Cloner le repo

```bash
git clone https://github.com/Duttonn/ProjetLogementEcoResponsable/tree/88c76cb5940caf408b6db73a6fa89ca11b84094a
cd ProjetLogementEcoResponsable
```

### 2. Installer les Dépendances

```bash
npm install
```

Cela installe les dépendances Node.js et crée un environnement virtuel Python (`venv`), tout en installant les modules nécessaires à partir de `requirements.txt`.

---

## Lancement du Projet

### 1. Générer fichiers dist

```bash
npm run build
```

### 2. Démarrer le Backend (FastAPI)

```bash
npm run serv
```

L'API FastAPI sera accessible à l'adresse **[https://0.0.0.0:8000](https://0.0.0.0:8000)**.

---

## Annexe

### Commandes Utiles (Linux/Mac)

- **Créer un environnement virtuel Python**

```bash
npm run create-venv
```

- **Installer les dépendances Python**

```bash
npm run install-python
```

- **Activer l'environnement virtuel**

```bash
npm run activate-venv
```

- **Générer un ************`requirements.txt`************ à jour**

```bash
npm run generate-requirements
```

- **Nettoyer le dossier dist**

```bash
npm run clean
```

### Commandes Utiles (Windows)

- **Créer un environnement virtuel Python**

```bash
npm run create-venv-w
```

- **Installer les dépendances Python**

```bash
npm run install-python-w
```

- **Activer l'environnement virtuel**

```bash
npm run activate-venv-w
```

- **Générer un **********`requirements.txt`********** à jour**

```bash
npm run generate-requirements-w
```

- **Nettoyer le dossier dist**

```bash
npm run clean-w
```

### Scripts de Développement

- **`npm run build`** : Build du projet pour la production
- **`npm run clean`** : Supprime le dossier `dist` (utilise `rm -rf` ou `rmdir /s /q` selon l'OS)

---

## Notes

- Pour toute anomalie, consultez la section [Annexe](#annexe).
- Le projet est compatible avec **Windows**, **Linux** et **MacOS**. Des ajustements peuvent être nécessaires pour les chemins d'accès Python sous Windows.

---

## License

Ce projet est sous licence MIT.

