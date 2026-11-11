# Welcome to your Lovable project

## Publier cet éditeur sur GitHub Pages

1. Dans Lovable, ouvrez **Paramètres → Git → GitHub** et connectez ce projet. Lovable crée un nouveau dépôt et y synchronise le code.
2. Le dépôt doit être public pour utiliser GitHub Pages avec un compte GitHub gratuit. Dans GitHub, ouvrez **Settings → Pages** et choisissez **GitHub Actions** comme source si nécessaire.
3. Dans **Actions**, lancez **Publish GitHub Pages** si la publication n'a pas démarré automatiquement.
4. Après le succès de la publication, copiez l'adresse affichée par GitHub Pages, suivie de `/ext.json`, dans les extensions avancées de Standard Notes.

La publication génère une version statique de l'éditeur et adapte automatiquement l'adresse du manifeste au dépôt. Aucune donnée de note n'est envoyée à GitHub : dans Standard Notes, elle reste dans la note chiffrée.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
