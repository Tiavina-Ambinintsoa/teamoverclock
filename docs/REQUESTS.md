
# Cahier des charges fonctionnel — plateforme Nova Terra

Voici le cahier des charges détaillé établi à partir des **18 entrées** présentes dans [To Do List](https://app.notion.com/p/To-Do-List-3ed96ce2d62e809ebba4fea8c2eb1d48?pvs=21).

Le périmètre contient :

- **10 fonctionnalités principales** : D01, D03, D04, D05, D06, D07, D08, D09, D19 et F22. [[1]](https://app.notion.com/p/list-des-requetes-3ee96ce2d62e801fb39fc0cd6c7df15f?pvs=21)
- **8 sujets complémentaires** : chatbot, structure de données, services fictifs, dangers, signalements, carte interactive, profils et structures de base de données.
- Toutes les tâches sont actuellement au statut **Not started**.
- Toutes les tâches sont affectées au même responsable dans Notion.
- Aucune date d’échéance n’est renseignée.
- Une incohérence doit être corrigée : **F22 est indiquée “Facile” dans le contenu de la tâche, mais “High” dans la propriété Difficulty de la base**. [[2]](https://app.notion.com/p/F22-Suivre-les-demandes-des-habitants-45c9dd969d8c4d6fac4c9d94294bf056?pvs=21)

---

## 1. Objectif général du projet

La plateforme Nova Terra doit permettre :

1. aux habitants de créer un compte et d’accéder à leurs démarches ;
2. aux habitants de consulter les services, actualités et informations de la ville ;
3. aux habitants de contacter l’administration et de suivre leurs demandes ;
4. aux agents municipaux de traiter les demandes reçues ;
5. aux administrateurs de gérer les utilisateurs, profils, droits et contenus ;
6. à la ville de centraliser ses données dans une architecture exploitable par le portail, la carte et le chatbot ;
7. d’intégrer des données issues d’API, de caméras, de satellites et de systèmes automatisés, avec validation humaine avant publication.

---

# 2. Règles communes à toutes les fonctionnalités

## 2.1 Règles fonctionnelles générales

Chaque fonctionnalité devra disposer de :

- un objectif clairement défini ;
- des utilisateurs concernés ;
- des champs d’entrée ;
- des règles de validation ;
- un résultat attendu ;
- des messages d’erreur ;
- des droits d’accès ;
- une traçabilité des actions ;
- des tests fonctionnels ;
- une documentation minimale.

## 2.2 Profils utilisateurs

La plateforme doit distinguer au minimum :

| Profil                    | Rôle principal                                                       |
| ------------------------- | --------------------------------------------------------------------- |
| Citoyen                   | Consulter les informations, envoyer et suivre ses demandes            |
| Agent municipal           | Traiter les demandes liées à son service                            |
| Administrateur de service | Valider les contenus et signalements de son service                   |
| Administrateur général  | Gérer tous les utilisateurs, rôles, contenus et paramètres         |
| Système/API              | Importer des données sans disposer automatiquement de droits humains |

Les droits doivent être contrôlés à deux niveaux :

1. **type de profil** : citoyen, agent, administrateur ;
2. **périmètre organisationnel** : service, secteur, zone géographique ou type de donnée.

---

# 3. Cahier des charges par entrée de la Todo List

## D01 — Créer un compte habitant

L’objectif actuel est de permettre à un nouvel habitant de créer simplement un compte et de retrouver son espace personnel. La tâche est classée **High / Low / 250 XP** dans la base et est demandée par le Haut Conseil de la Ville. [[3]](https://app.notion.com/p/D01-Cr-er-un-compte-habitant-2c9d0fce2486469595d8bc2005b806c3?pvs=21)

### Entrées utilisateur

Le formulaire devra demander :

- nom ;
- prénom ;
- adresse e-mail ou numéro de téléphone ;
- mot de passe ;
- confirmation du mot de passe ;
- adresse ou zone de résidence, si nécessaire ;
- acceptation des conditions d’utilisation ;
- consentement relatif aux données personnelles ;
- éventuellement un code de vérification.

### Exigences fonctionnelles

- Vérifier que l’adresse e-mail ou le numéro de téléphone n’est pas déjà utilisé.
- Vérifier la robustesse du mot de passe.
- Envoyer un code ou un lien de confirmation.
- Empêcher la création de comptes avec des informations invalides.
- Afficher clairement les erreurs de saisie.
- Créer un profil citoyen par défaut.
- Rediriger l’utilisateur vers son espace personnel après validation.
- Ne jamais afficher le mot de passe en clair.
- Enregistrer la date de création et le dernier accès.

### Critères d’acceptation

- Un nouvel utilisateur peut créer un compte en moins de quelques étapes.
- Un compte non vérifié ne peut pas accéder à toutes les fonctionnalités sensibles.
- Un e-mail déjà utilisé produit un message explicite.
- Le mot de passe est stocké de manière sécurisée.
- Le citoyen reçoit une confirmation de création.
- L’administrateur peut retrouver le compte dans la liste des utilisateurs.

### Dépendances

- D08 — Gestion des profils ;
- D09 — Droits d’accès ;
- D03 — Connexion ;
- structure `User` de la base de données.

---

## D03 — Se connecter à son espace personnel

La fonctionnalité doit permettre aux citoyens inscrits de revenir sur la plateforme et d’accéder à leurs informations et démarches. Elle est classée **High / Low / 250 XP**. [[4]](https://app.notion.com/p/D03-Se-connecter-son-espace-personnel-999d68855a174b5998b3b3402d6c6c98?pvs=21)

### Entrées utilisateur

- adresse e-mail ou numéro de téléphone ;
- mot de passe ;
- éventuellement code d’authentification à deux facteurs ;
- demande de réinitialisation du mot de passe.

### Exigences fonctionnelles

- Permettre la connexion avec les identifiants créés dans D01.
- Vérifier l’état du compte : actif, suspendu, non vérifié ou supprimé.
- Créer une session sécurisée.
- Prévoir une déconnexion manuelle.
- Prévoir une expiration automatique de session.
- Afficher un message générique en cas d’identifiants incorrects.
- Bloquer temporairement les tentatives répétées.
- Permettre la réinitialisation du mot de passe.
- Rediriger chaque profil vers l’espace qui lui correspond.

### Critères d’acceptation

- Un citoyen connecté arrive dans son espace personnel.
- Un compte suspendu ne peut pas se connecter.
- Le mot de passe oublié peut être renouvelé par un lien sécurisé.
- Une session expirée oblige l’utilisateur à se reconnecter.
- L’utilisateur ne peut pas accéder à l’espace agent en modifiant simplement une URL.

### Dépendances

- D01 ;
- D08 ;
- D09 ;
- journal d’audit et gestion des sessions.

---

## D04 — Contacter les services municipaux

La fonctionnalité doit fournir un formulaire simple pour transmettre un message à l’administration et confirmer son envoi. Elle est demandée par le Service des Relations Citoyennes et classée **Medium / Low / 250 XP**. [[5]](https://app.notion.com/p/D04-Contacter-les-services-municipaux-526e8107ef9c45e4a486c353ad1ee2ec?pvs=21)

### Entrées du formulaire

- service destinataire ;
- sujet ;
- catégorie de demande ;
- description détaillée ;
- nom et prénom ;
- adresse e-mail ou téléphone ;
- adresse de résidence, si nécessaire ;
- pièces jointes facultatives ;
- consentement au traitement des données ;
- niveau d’urgence, si la mairie le prévoit.

### Exigences fonctionnelles

- Proposer une liste des services municipaux.
- Vérifier les champs obligatoires.
- Limiter la taille et le type des pièces jointes.
- Générer un numéro unique de demande.
- Enregistrer la date et l’heure d’envoi.
- Envoyer une confirmation à l’utilisateur.
- Transmettre la demande au service sélectionné.
- Créer une notification pour le service destinataire.
- Empêcher l’envoi multiple accidentel.
- Permettre à l’utilisateur connecté de retrouver le message dans son historique.

### Critères d’acceptation

- Une demande valide est enregistrée une seule fois.
- Le citoyen reçoit un numéro de suivi.
- Le service destinataire voit la demande dans son espace.
- Une pièce jointe non autorisée est refusée avant l’envoi.
- L’utilisateur reçoit une confirmation claire.
- Une demande non connectée peut être autorisée ou interdite selon la décision métier.

---

## D05 — Consulter les services municipaux

La fonctionnalité doit présenter clairement les principaux services de Nova Terra et les informations utiles associées. Elle est demandée par la Mairie de Nova Terra et classée **High / Low / 250 XP**. [[6]](https://app.notion.com/p/D05-Consulter-les-services-municipaux-6ed69ca0a0dd42d28268f93c974fbff4?pvs=21)

### Informations à afficher pour chaque service

- nom du service ;
- description ;
- catégorie ;
- adresse ;
- localisation sur la carte ;
- horaires d’ouverture ;
- jours de fermeture ;
- téléphone ;
- adresse e-mail ;
- responsable ;
- démarches proposées ;
- documents nécessaires ;
- tarifs éventuels ;
- accessibilité ;
- langues disponibles ;
- lien vers une prise de rendez-vous ;
- lien vers un formulaire de contact ;
- date de dernière mise à jour.

### Exigences fonctionnelles

- Afficher une liste des services.
- Permettre la recherche par mot-clé.
- Permettre le filtrage par catégorie.
- Afficher une fiche détaillée.
- Afficher la position du service sur la carte.
- Signaler les services temporairement fermés.
- Afficher les horaires dans le fuseau horaire local.
- Permettre à un administrateur de publier ou masquer un service.

### Critères d’acceptation

- Un citoyen trouve un service à partir de son nom ou de sa catégorie.
- Les informations de contact sont directement utilisables.
- Un service fermé ou suspendu est clairement identifié.
- Les données affichées sont cohérentes avec la carte.
- Un service non publié n’est pas visible publiquement.

---

## D06 — Consulter les actualités municipales

La fonctionnalité doit permettre de retrouver les annonces, changements de service et informations pratiques publiés par la ville. Elle est demandée par la Mairie de Nova Terra et classée **High / Low / 250 XP**. [[7]](https://app.notion.com/p/D06-Consulter-les-actualit-s-municipales-0e658b44863c4056ae19e8807a998b43?pvs=21)

### Informations d’une actualité

- titre ;
- résumé ;
- contenu complet ;
- catégorie ;
- image ou illustration ;
- auteur ou service émetteur ;
- date de publication ;
- date de mise à jour ;
- période de validité ;
- niveau d’importance ;
- services ou zones concernés ;
- documents joints ;
- liens associés.

### Exigences fonctionnelles

- Afficher les actualités les plus récentes.
- Permettre la recherche par mot-clé.
- Filtrer par catégorie.
- Mettre en évidence les informations urgentes.
- Afficher une page de détail.
- Archiver automatiquement ou manuellement les actualités expirées.
- Permettre le partage d’un lien.
- Prévoir une version lisible sur mobile.
- Autoriser la publication uniquement aux profils habilités.

### Critères d’acceptation

- Une nouvelle actualité apparaît dans l’ordre chronologique prévu.
- Une actualité urgente est visuellement identifiable.
- Une actualité expirée n’est plus affichée comme active.
- Un utilisateur peut retrouver une actualité par son titre.
- La date de publication et le service émetteur sont visibles.

---

## D07 — Concevoir une page d’accueil claire

L’objectif est de hiérarchiser les informations essentielles et de donner un accès évident aux principaux services. La tâche est classée **Medium / Medium / 500 XP** et demandée par la Mairie de Nova Terra. [[8]](https://app.notion.com/p/D07-Concevoir-une-page-d-accueil-claire-9621c11a894c4c60940768ef2d9d20b4?pvs=21)

### Contenu recommandé

La page d’accueil devra présenter :

1. le logo et l’identité de Nova Terra ;
2. une barre de recherche globale ;
3. un accès à la connexion ;
4. les services les plus utilisés ;
5. les dernières actualités ;
6. un accès au dépôt de signalement ;
7. un accès aux démarches personnelles ;
8. les contacts d’urgence ;
9. une carte ou un accès à la carte interactive ;
10. un accès au chatbot ;
11. les messages importants de la ville.

### Exigences UX/UI

- Être compréhensible sans formation.
- Donner la priorité aux actions citoyennes.
- Fonctionner sur mobile, tablette et ordinateur.
- Respecter les règles d’accessibilité.
- Utiliser des libellés explicites.
- Limiter le nombre de niveaux de navigation.
- Éviter les animations inutiles.
- Afficher un état de chargement lors des appels API.
- Prévoir une page d’erreur compréhensible.

### Critères d’acceptation

- Un nouvel utilisateur comprend immédiatement à quoi sert la plateforme.
- Les actions “Se connecter”, “Consulter les services”, “Signaler un problème” et “Contacter la mairie” sont accessibles depuis l’accueil.
- La page est utilisable au clavier.
- L’affichage est correct sur écran mobile.
- Les contenus importants restent visibles même si une API est indisponible.

---

## D08 — Gérer les profils utilisateurs

Cette fonctionnalité doit distinguer les citoyens, agents municipaux et administrateurs afin d’adapter les outils et responsabilités. Elle est classée **High / Medium / 500 XP**. [[9]](https://app.notion.com/p/D08-G-rer-les-profils-utilisateurs-0af60a43b4a14053a69fd23dcaea90ec?pvs=21)

### Types de profils

#### Citoyen

- consulter les informations publiques ;
- envoyer une demande ;
- suivre ses demandes ;
- modifier ses informations personnelles ;
- utiliser le chatbot ;
- consulter ses notifications.

#### Agent municipal

- consulter les demandes affectées à son service ;
- modifier le statut d’une demande ;
- ajouter des commentaires internes ;
- répondre au citoyen ;
- consulter les données nécessaires à son travail.

#### Administrateur de service

- gérer les agents de son service ;
- valider les signalements associés à son service ;
- publier ou modifier les données de son périmètre ;
- consulter les statistiques du service.

#### Administrateur général

- gérer tous les profils ;
- gérer tous les services ;
- gérer les rôles ;
- gérer les règles d’accès ;
- consulter les journaux d’audit ;
- corriger ou supprimer les contenus.

### Informations du profil

- identifiant unique ;
- nom ;
- prénom ;
- e-mail ;
- téléphone ;
- type de profil ;
- service de rattachement ;
- statut du compte ;
- date de création ;
- dernier accès ;
- préférences de notification ;
- zone géographique autorisée ;
- historique des changements.

### Critères d’acceptation

- Un utilisateur ne peut avoir qu’un profil actif principal.
- Un agent doit être rattaché à au moins un service.
- Un administrateur de service ne peut gérer que son périmètre.
- Toute modification de rôle est journalisée.
- Un profil désactivé perd immédiatement ses droits.

---

## D09 — Mettre en place les droits d’accès

La fonctionnalité doit limiter l’accès aux informations, actions et fonctions sensibles selon le profil autorisé. Elle est classée **Medium / Medium / 500 XP**. [[10]](https://app.notion.com/p/D09-Mettre-en-place-les-droits-d-acc-s-266fa86c94ee419286124dc08ed6c4fa?pvs=21)

### Règles de sécurité

- Appliquer le principe du moindre privilège.
- Refuser par défaut tout accès non explicitement autorisé.
- Vérifier les droits côté interface et côté serveur.
- Contrôler l’accès à chaque objet : demande, signalement, preuve, service ou utilisateur.
- Séparer les droits de lecture, création, modification, validation et suppression.
- Journaliser les accès sensibles.
- Empêcher un agent de consulter les données d’un autre service sans autorisation.
- Protéger les documents et images contre les accès directs non autorisés.

### Matrice minimale

| Fonction                               | Citoyen | Agent            | Admin service | Admin général |
| -------------------------------------- | ------- | ---------------- | ------------- | --------------- |
| Consulter les services publics         | Oui     | Oui              | Oui           | Oui             |
| Créer une demande                     | Oui     | Oui si autorisé | Oui           | Oui             |
| Voir ses propres demandes              | Oui     | Oui              | Oui           | Oui             |
| Voir toutes les demandes d’un service | Non     | Oui              | Oui           | Oui             |
| Valider un signalement                 | Non     | Selon permission | Oui           | Oui             |
| Gérer les utilisateurs                | Non     | Non              | Limité       | Oui             |
| Modifier les droits                    | Non     | Non              | Non           | Oui             |
| Consulter les journaux d’audit        | Non     | Non              | Limité       | Oui             |

### Critères d’acceptation

- Une tentative d’accès interdite retourne une erreur contrôlée.
- Modifier l’URL ne permet pas de contourner les droits.
- Les permissions sont testées avec chaque profil.
- Les changements de droits sont historisés.
- La révocation d’un rôle est effective sans délai important.

---

## D19 — Créer l’espace de travail des agents

La tâche vise à mettre à disposition une interface distincte de l’espace citoyen afin de consulter les informations transmises par l’API Nova Terra. Elle est classée **Medium / High / 750 XP** et dépend fortement des droits d’accès et de la structure des données. [[11]](https://app.notion.com/p/D19-Cr-er-l-espace-de-travail-des-agents-ff931343c98746a69d24d551a849dd56?pvs=21)

### Fonctionnalités de l’espace agent

- tableau de bord ;
- liste des demandes ;
- liste des signalements ;
- filtres par statut, priorité, date et secteur ;
- recherche globale ;
- détail d’une demande ;
- affectation à un responsable ;
- commentaires internes ;
- historique des changements ;
- accès aux preuves ;
- notifications ;
- indicateur de synchronisation API ;
- statistiques du service.

### Données provenant de l’API Nova Terra

L’interface devra indiquer :

- date de dernière synchronisation ;
- statut de la synchronisation ;
- nombre d’éléments importés ;
- erreurs d’import ;
- éléments en attente de validation ;
- source de chaque donnée ;
- date de dernière mise à jour ;
- identifiant externe de l’objet.

### Critères d’acceptation

- Un agent ne voit que les données de son périmètre.
- Les données importées sont clairement identifiées comme externes.
- Une erreur API ne bloque pas l’accès aux données déjà enregistrées.
- Les données non validées ne sont pas automatiquement publiées au public.
- L’agent peut ouvrir une demande depuis le tableau de bord.
- Les actions importantes sont visibles dans l’historique.

---

## F22 — Suivre les demandes des habitants

La fonctionnalité doit afficher les demandes reçues, leur état et celles qui nécessitent encore une action. La description d’origine indique **Facile / 250 XP**, tandis que la propriété de la base indique **High** pour Difficulty ; cette valeur doit être confirmée. [[2]](https://app.notion.com/p/F22-Suivre-les-demandes-des-habitants-45c9dd969d8c4d6fac4c9d94294bf056?pvs=21)

### Cycle de vie proposé

- Nouvelle ;
- Reçue ;
- À qualifier ;
- Affectée ;
- En cours ;
- En attente d’informations ;
- Résolue ;
- Fermée ;
- Rejetée ;
- Annulée.

### Informations d’une demande

- numéro de suivi ;
- citoyen demandeur ;
- service destinataire ;
- catégorie ;
- sujet ;
- description ;
- pièces jointes ;
- priorité ;
- responsable ;
- statut ;
- dates de création, modification et clôture ;
- commentaires publics ;
- commentaires internes ;
- historique des changements ;
- délai cible ;
- niveau de satisfaction éventuel.

### Exigences fonctionnelles

- Afficher les demandes dans l’espace agent.
- Permettre le tri par urgence, ancienneté et statut.
- Permettre l’affectation à un agent.
- Permettre le changement de statut.
- Identifier les demandes nécessitant une action.
- Prévenir le citoyen lors des changements importants.
- Conserver l’historique complet.
- Empêcher la suppression définitive sans autorisation.
- Permettre la clôture avec une réponse obligatoire.
- Prévoir une relance automatique pour les demandes bloquées.

### Critères d’acceptation

- Une nouvelle demande apparaît dans le service approprié.
- L’agent voit clairement les demandes qui nécessitent son action.
- Le citoyen peut voir le statut de sa demande.
- Chaque modification produit une entrée d’historique.
- Une demande ne peut pas être clôturée sans résultat ou commentaire.
- Les délais dépassés sont signalés.

---

# 4. Fonctionnalités complémentaires

## 4.1 Chatbot texte et vocal

L’entrée indique que toutes les informations de l’application doivent être connues du chatbot afin d’aider les habitants. [[12]](https://app.notion.com/p/Chat-bot-text-et-vocal-3ee96ce2d62e80c3b13ad26855fd2e2d?pvs=21)

### Fonctionnalités

- chat textuel ;
- entrée vocale ;
- conversion voix-texte ;
- lecture vocale de la réponse ;
- recherche dans les services, actualités, démarches et dangers ;
- liens vers les pages sources ;
- création guidée d’un signalement ;
- création guidée d’une demande ;
- transfert vers un agent ;
- conservation facultative de l’historique.

### Exigences importantes

Le chatbot ne doit pas simplement “connaître” les données. Il doit :

- utiliser une base de connaissances versionnée ;
- citer ou relier la source de sa réponse ;
- préciser lorsqu’une information est incertaine ;
- ne pas inventer un horaire, une adresse ou une procédure ;
- demander confirmation avant de créer une demande ;
- masquer les informations personnelles inutiles ;
- différencier une urgence d’une demande ordinaire ;
- permettre de corriger une transcription vocale.

### Critères d’acceptation

- Le chatbot répond à partir des informations publiées.
- Il fournit un lien vers la page concernée.
- Il demande confirmation avant toute création de dossier.
- Une question inconnue est transférée ou signalée comme non couverte.
- La voix et le texte produisent le même résultat fonctionnel.

---

## 4.2 Générer la structure de données

L’entrée contient deux besoins : créer la structure de la base de données et générer des données fictives utilisables par les fonctionnalités. [[13]](https://app.notion.com/p/Generate-data-structure-3ee96ce2d62e8032b767e45406f95707?pvs=21)

### Entités minimales

- `User`
- `Role`
- `Service`
- `Department`
- `News`
- `Request`
- `RequestStatusHistory`
- `Evidence`
- `Report`
- `Building`
- `Sector`
- `Transport`
- `Camera`
- `SatelliteObservation`
- `Danger`
- `Notification`
- `ChatSession`
- `AuditLog`
- `ApiSynchronization`

### Données fictives

Les données de démonstration devront couvrir :

- plusieurs citoyens ;
- plusieurs agents ;
- plusieurs services ;
- plusieurs demandes dans différents statuts ;
- des demandes avec pièces jointes ;
- des signalements validés et non validés ;
- plusieurs secteurs géographiques ;
- des bâtiments municipaux ;
- des moyens de transport ;
- des actualités ;
- des situations dangereuses ;
- des erreurs d’API ;
- des cas limites.

### Règles

- Les données fictives doivent être identifiables comme telles.
- Aucune donnée réelle ne doit être utilisée.
- Les relations doivent être cohérentes.
- Les identifiants doivent être stables.
- Le jeu de données doit pouvoir être recréé automatiquement.
- Les scripts de génération doivent être versionnés.

---

## 4.3 Les services — ville fictive et futuriste

L’entrée demande de générer par IA une structure complète d’une ville fictive et futuriste. [[14]](https://app.notion.com/p/Les-services-3ee96ce2d62e80edb631d200105990c0?pvs=21)

### Contenu à générer

- nom de la ville ;
- secteurs ;
- quartiers ;
- bâtiments ;
- services publics ;
- centres administratifs ;
- moyens de transport ;
- hôpitaux ;
- écoles ;
- centres de sécurité ;
- zones résidentielles ;
- zones industrielles ;
- infrastructures énergétiques ;
- réseaux de communication ;
- lieux publics ;
- responsables de service ;
- horaires ;
- coordonnées géographiques fictives ;
- relations entre les services.

### Exigences

- Utiliser une nomenclature cohérente.
- Éviter les doublons.
- Générer des identifiants uniques.
- Relier chaque bâtiment à un secteur.
- Relier chaque service à un bâtiment ou une zone.
- Générer des coordonnées compatibles avec la carte.
- Ajouter une description compréhensible par les citoyens.
- Prévoir une validation humaine avant publication.
- Conserver la version du contenu généré par IA.

### Critères d’acceptation

- La ville peut être affichée sans données manquantes critiques.
- Chaque service possède une localisation.
- Les secteurs sont représentables sur la carte.
- Les données générées peuvent alimenter le chatbot.
- Un administrateur peut modifier les données générées.

---

## 4.4 Les signalements

L’entrée prévoit des signalements avec différents statuts, un responsable, des preuves, des images issues de caméras ou satellites, une validation administrative, de la conversion voix-texte et une création automatique par chatbot. [[15]](https://app.notion.com/p/Les-signalements-3ee96ce2d62e80df9fa1faae4e34249a?pvs=21)

### Informations d’un signalement

- numéro unique ;
- titre ;
- description ;
- catégorie ;
- localisation ;
- date et heure de constat ;
- source du signalement ;
- citoyen ou système à l’origine ;
- service responsable ;
- agent assigné ;
- priorité ;
- statut ;
- niveau de confiance ;
- pièces justificatives ;
- images ;
- faits constatés ;
- validation administrative ;
- historique ;
- date de résolution.

### Sources possibles

- citoyen ;
- agent ;
- chatbot ;
- caméra ;
- satellite ;
- API externe ;
- import automatique.

### Statuts proposés

- Brouillon ;
- Reçu ;
- À vérifier ;
- Validé ;
- Rejeté ;
- Affecté ;
- En cours ;
- Résolu ;
- Archivé.

### Exigences

- Les images de caméra et de satellite doivent être séparées des pièces citoyennes.
- Chaque image doit conserver sa source, sa date et son niveau de confiance.
- Un signalement automatique doit être validé avant publication ou action critique.
- Le service responsable doit être déterminé selon la catégorie et la localisation.
- Les preuves doivent être stockées dans une table séparée.
- Les accès aux preuves doivent être restreints.
- La transcription vocale doit être relue avant validation.
- Le chatbot doit demander confirmation avant création.
- La suppression définitive doit être interdite ou réservée à l’administrateur général.

---

## 4.5 Les structures de la base de données

Cette entrée demande de faire une structure contenant toutes les informations nécessaires. [[16]](https://app.notion.com/p/Les-structures-de-la-base-de-donnee-3ee96ce2d62e80d3a529c4adb5ad9a19?pvs=21)

### Principes d’architecture

- Une table dédiée par concept métier.
- Des relations explicites entre les tables.
- Des identifiants techniques uniques.
- Des dates de création et de modification.
- Des statuts contrôlés par des valeurs autorisées.
- Des contraintes d’intégrité.
- Des journaux pour les actions sensibles.
- Des index sur les recherches fréquentes.
- Des champs `created_at`, `updated_at` et éventuellement `deleted_at`.
- Une séparation entre données publiques, internes et confidentielles.

### Tables prioritaires

#### `users`

- `id`
- `first_name`
- `last_name`
- `email`
- `phone`
- `password_hash`
- `profile_type`
- `status`
- `created_at`
- `last_login_at`

#### `services`

- `id`
- `name`
- `description`
- `category`
- `address`
- `building_id`
- `phone`
- `email`
- `opening_hours`
- `status`
- `published_at`

#### `requests`

- `id`
- `tracking_number`
- `requester_id`
- `service_id`
- `assigned_agent_id`
- `category`
- `subject`
- `description`
- `priority`
- `status`
- `created_at`
- `closed_at`

#### `evidence`

- `id`
- `report_id`
- `source_type`
- `file_url`
- `mime_type`
- `captured_at`
- `confidence_score`
- `validation_status`
- `validated_by`

#### `audit_logs`

- `id`
- `actor_id`
- `action`
- `entity_type`
- `entity_id`
- `old_value`
- `new_value`
- `created_at`
- `ip_address`, si nécessaire

---

## 4.6 Les profils

L’entrée précise qu’il faut un profil administrateur par service, qu’un administrateur ne peut valider que les signalements de son service et que chaque profil doit contenir toutes les informations nécessaires. [[17]](https://app.notion.com/p/Profiles-3ee96ce2d62e80dc8105fbdbb42dd5d4?pvs=21)

### Règles spécifiques

- Un service peut avoir plusieurs administrateurs.
- Un administrateur de service est rattaché à un ou plusieurs services autorisés.
- Il ne peut pas valider un signalement hors de son périmètre.
- Un administrateur général peut déléguer ou révoquer les droits.
- Les changements de rattachement doivent être historisés.
- Un profil doit avoir un statut : actif, suspendu, désactivé.
- La suppression d’un profil ne doit pas supprimer son historique métier.

---

## 4.7 La carte interactive

L’entrée prévoit des données issues de satellites et de caméras, une validation par administrateur, une carte en forme de ruche divisée par secteurs, des bâtiments, des moyens de transport et une aide à la navigation. [[18]](https://app.notion.com/p/Map-interactif-3ee96ce2d62e80dda40cda3ef68e786a?pvs=21)

### Composants de la carte

#### Secteurs

- identifiant ;
- nom ;
- hexagone géographique ;
- couleur ;
- niveau d’activité ;
- services responsables ;
- données associées.

#### Bâtiments

- nom ;
- type ;
- secteur ;
- coordonnées ;
- adresse ;
- horaires ;
- services présents ;
- accessibilité ;
- état du bâtiment.

#### Transports

- type de transport ;
- identifiant ;
- immatriculation, si applicable ;
- statut public ou personnel ;
- position ;
- état ;
- capacité ;
- propriétaire ou service responsable.

#### Données caméra et satellite

- source ;
- date d’observation ;
- position ;
- image ou résultat d’analyse ;
- niveau de confiance ;
- statut de validation ;
- administrateur validateur ;
- date de validation.

### Navigation

- rechercher un bâtiment ;
- afficher son emplacement ;
- calculer un itinéraire ;
- afficher les moyens de transport disponibles ;
- proposer une destination ;
- gérer les bâtiments temporairement fermés ;
- afficher les zones interdites ou dangereuses ;
- adapter l’affichage mobile.

### Règles de sécurité

- Ne pas exposer les images sensibles au public.
- Ne pas afficher les caméras en temps réel sans décision explicite.
- Masquer les données personnelles.
- Obliger une validation administrative pour les observations automatiques.
- Conserver la source de toute donnée affichée.

---

## 4.8 Les dangers

L’entrée demande une page d’aide accessible depuis le chatbot, comprenant des mesures de sécurité intergalactiques et un protocole en cas d’invasion extraterrestre. [[19]](https://app.notion.com/p/Les-danger-3ee96ce2d62e8066a63ccc421b8096de?pvs=21)

### Structure de la page d’aide

- présentation du danger ;
- niveau de gravité ;
- zones concernées ;
- date et durée de validité ;
- comportement recommandé ;
- comportement interdit ;
- numéros ou canaux d’urgence ;
- points de rassemblement ;
- protocole détaillé ;
- source de l’information ;
- date de validation ;
- version de la procédure.

### Protocoles

Pour une invasion extraterrestre fictive, prévoir :

1. identifier l’alerte ;
2. confirmer la source ;
3. informer la population ;
4. recommander de rester à l’abri ;
5. indiquer les zones à éviter ;
6. coordonner les services municipaux ;
7. publier les mises à jour ;
8. clôturer l’alerte uniquement après validation officielle.

### Exigences

- Le chatbot doit donner des consignes cohérentes avec la page officielle.
- Les informations d’urgence doivent être distinctes des informations ordinaires.
- Les anciennes alertes doivent être archivées.
- Toute procédure doit avoir un responsable et une date de validation.
- Les messages doivent rester compréhensibles et non alarmistes.
- Les alertes fictives doivent être clairement distinguées d’une situation réelle.

---

# 5. Modèle de données commun recommandé

## 5.1 Statuts génériques

Les statuts doivent être configurés plutôt que saisis librement :

- Not started ;
- In progress ;
- Waiting for validation ;
- Waiting for information ;
- Done ;
- Rejected ;
- Archived.

## 5.2 Priorités

- Low ;
- Medium ;
- High ;
- Critical, à ajouter si les situations d’urgence sont gérées.

## 5.3 Provenance des données

Tout contenu doit pouvoir indiquer :

- source humaine ou automatique ;
- utilisateur ou système d’origine ;
- date de collecte ;
- date d’import ;
- date de validation ;
- niveau de confiance ;
- version ;
- responsable de validation.

## 5.4 Classification des données

| Niveau       | Exemple                                | Accès                     |
| ------------ | -------------------------------------- | -------------------------- |
| Public       | Services, actualités publiées        | Tous                       |
| Interne      | Commentaires d’agents, statistiques   | Agents autorisés          |
| Confidentiel | Coordonnées citoyennes, preuves       | Profils habilités         |
| Sensible     | Images caméra, données de sécurité | Administrateurs autorisés |

---

# 6. Exigences techniques transversales

## Sécurité

- chiffrement des mots de passe ;
- HTTPS obligatoire ;
- gestion sécurisée des sessions ;
- limitation des tentatives de connexion ;
- contrôle des permissions côté serveur ;
- journalisation des actions sensibles ;
- protection contre les fichiers dangereux ;
- sauvegardes régulières ;
- plan de restauration ;
- séparation des environnements développement, test et production.

## Accessibilité

- navigation au clavier ;
- contraste suffisant ;
- textes alternatifs pour les images ;
- labels explicites ;
- compatibilité avec lecteur d’écran ;
- sous-titres ou transcription pour les contenus vocaux ;
- messages d’erreur compréhensibles.

## Performance

- chargement initial rapide ;
- pagination des listes ;
- recherche indexée ;
- cache des données publiques ;
- traitement asynchrone des fichiers lourds ;
- gestion propre des erreurs API ;
- affichage d’un état de chargement.

## Traçabilité

Toute action importante doit enregistrer :

- qui a réalisé l’action ;
- quelle action a été réalisée ;
- sur quel objet ;
- quand ;
- quelle était la valeur précédente ;
- quelle est la nouvelle valeur ;
- pourquoi, lorsque cela est nécessaire.

---

# 7. Critères de recette globale

Le projet pourra être considéré comme fonctionnel lorsque :

- un citoyen peut créer un compte ;
- il peut se connecter et se déconnecter ;
- il peut consulter les services et actualités ;
- il peut contacter un service municipal ;
- il peut déposer et suivre une demande ;
- un agent peut voir les demandes de son service ;
- un administrateur peut gérer les profils ;
- les droits empêchent les accès non autorisés ;
- les signalements peuvent être créés, affectés et validés ;
- la carte affiche les secteurs et bâtiments ;
- les données fictives couvrent les principaux scénarios ;
- le chatbot répond à partir de données publiées ;
- le chatbot ne crée pas d’action sans confirmation ;
- toutes les actions sensibles sont journalisées ;
- les données automatiques ou générées par IA sont validées avant publication.

---

# 8. Décisions à prendre avant le développement

Les points suivants doivent être validés :

1. L’authentification se fera-t-elle par e-mail, téléphone ou les deux ?
2. L’adresse complète du citoyen est-elle obligatoire ?
3. L’authentification à deux facteurs est-elle nécessaire pour les agents ?
4. Les citoyens non connectés peuvent-ils contacter la mairie ?
5. Quels types de pièces jointes sont autorisés ?
6. Quels sont les délais de traitement attendus par service ?
7. Les caméras et satellites sont-ils réels, simulés ou uniquement démonstratifs ?
8. Les données de transport sont-elles publiques ou internes ?
9. Qui peut valider les contenus générés par IA ?
10. Le chatbot doit-il pouvoir créer directement un signalement après confirmation ?
11. Le chatbot doit-il conserver les conversations ?
12. Quel est le système de base de données final : Supabase ou une autre solution ?
13. F22 doit-elle être classée **Facile** ou **High** ?
14. Les priorités et niveaux de difficulté doivent-ils être renseignés pour les huit tâches complémentaires ?
15. Quelles sont les obligations légales concernant les données personnelles et les images ?

---

## Priorité de réalisation recommandée

1. Structure de données et jeux de données fictifs.
2. D01 — Création de compte.
3. D03 — Connexion.
4. D08 — Profils.
5. D09 — Droits d’accès.
6. D05 — Services municipaux.
7. D06 — Actualités.
8. D07 — Page d’accueil.
9. D04 — Contact avec les services.
10. F22 — Suivi des demandes.
11. D19 — Espace agent.
12. Signalements.
13. Carte interactive.
14. Chatbot texte et vocal.
15. Dangers et protocoles.
16. Génération avancée de la ville fictive.

Cette séquence réduit les dépendances techniques : les comptes et les droits sont construits avant les espaces citoyens et agents, tandis que la base de données est préparée avant la carte, les signalements et le chatbot.

OTHERS INFORMATIONS

- map fictif de la ville (Par secteur en forme de haxagone, donc dynamique peut être rajouter ou supprimer ou modifier, placer avec un corrdonner X et Y dans une refernce)
  - Batiment, transport (dynamique avec CRUD)
- Voice to texte pour creer les signalements,
- Call avec un support
- Chatbot pour demander des informations (les chemins a prendres, les documents necessaires, les etaps a suivre selon les donnees)
- Les habitants demmandes des services ou fait des signalement
- On a un formulaire avec toutes les informations necessaire pour faire un signalement(avec la localisation fictif par secteur et batiment),
- Les profils doivent etre verifier via un CIN fictif, un IA valide le CIN selon un model precis
  - Seules les profils valider peuvent faires signalement mais ils peuvent quand meme utiliser pour voir les informations et demander des informations
  - Un profil a des points pour que ses signalement soit plus credibles au yeux des autres habitants meme si c’est deja valider par l’admin
  - les autres utilisateurs peuvent aussi mettre des points sur un utilisateur
  - Les utilisateurs ne peuvent pas mettre des points sur les sigalement
  - Il y a un profil admin dans chaque service(police, pompier, ambulance, les differentes servieces municipaux)
  - Il y a des profiles pour les mineurs, un profil parrainer par un autre utilisateur majeur car la creation d ‘un compte necessaire une preuve de majorite(CIN)
- Les signalements ou publications peuvent regrouper par type ou par localisation, selon les informatinos qu’ils on en commun
- Les utilisateurs peuvent commenter les annonces
- Les annoncees sont reglementés par les admins
- Il y a les actualité dans le site mais on envoie aussi des newsletter au utilisateur si ils on en besoin sur les topics qui les interessent
