document.addEventListener('DOMContentLoaded', function() {
    const videoGrid = document.querySelector('.video-grid');
    if (!videoGrid) return;

    let pageType;
    const path = window.location.pathname.toLowerCase();

    // Détermination du type de page
    if (path.includes('vid')) {
        pageType = 'videoFavorites'; 
    } else if (path.includes('audios')) {
        pageType = 'audioFavorites'; 
    } else if (path.includes('/images')) {
        pageType = 'imageFavorites'; 
    } else {
        return;
    }
    
    // --- FONCTIONS FAVORIS ---
    function updateFavoriteButton(button, mèmeData, favoritesKey) {
        let favorites = JSON.parse(localStorage.getItem(favoritesKey)) || [];
        let isFavorite;
        if (favoritesKey === 'audioFavorites') {
            isFavorite = favorites.includes(mèmeData.title);
        } else {
            isFavorite = favorites.some(fav => fav.title === mèmeData.title);
        }
        button.innerHTML = `<img src="${isFavorite ? 'image/icones/favoris_cliquer.png' : 'image/icones/favoris.png'}" alt="Favoris Icon">`;
        button.onclick = function(e) {
            e.stopPropagation(); // Empêche d'ouvrir la modal en cliquant sur le bouton
            toggleFavorite(button, mèmeData, favoritesKey);
        };
    }

    function toggleFavorite(button, mèmeData, favoritesKey) {
        let favorites = JSON.parse(localStorage.getItem(favoritesKey)) || [];
        let isFavorite = (favoritesKey === 'audioFavorites') 
            ? favorites.includes(mèmeData.title) 
            : favorites.some(fav => fav.title === mèmeData.title);

        if (isFavorite) {
            favorites = (favoritesKey === 'audioFavorites')
                ? favorites.filter(favTitle => favTitle !== mèmeData.title)
                : favorites.filter(favObj => favObj.title !== mèmeData.title);
            button.querySelector('img').src = 'image/icones/favoris.png';
        } else {
            favorites.push(favoritesKey === 'audioFavorites' ? mèmeData.title : mèmeData);
            button.querySelector('img').src = 'image/icones/favoris_cliquer.png';
        }
        localStorage.setItem(favoritesKey, JSON.stringify(favorites));
    }

    // --- GESTION DE LA MODAL (POP-UP) ---
    const modal = document.getElementById('video-modal');
    const modalMediaContainer = document.getElementById('modal-media-container');
    const modalTitle = document.getElementById('modal-title');
    const closeModal = document.querySelector('.close-modal');

    function openModal(title, mediaPath, type) {
        modalTitle.innerText = decodeURIComponent(title);
        modalMediaContainer.innerHTML = ''; // Vide le contenu précédent

        if (type === 'video') {
            modalMediaContainer.innerHTML = `<video controls autoplay style="width:100%"><source src="${mediaPath}"></video>`;
        } else if (type === 'image') {
            modalMediaContainer.innerHTML = `<img src="${mediaPath}" style="width:100%">`;
        }

        // Configuration des boutons de la modal
        document.getElementById('modal-download').href = mediaPath;
        document.getElementById('modal-share').onclick = () => {
            const fullUrl = window.location.origin + window.location.pathname + '#' + encodeURIComponent(title);
            navigator.clipboard.writeText(fullUrl).then(() => alert('Lien de partage copié !'));
        };

        modal.style.display = "flex";
    }

    if (closeModal) {
        closeModal.onclick = () => {
            modal.style.display = "none";
            modalMediaContainer.innerHTML = '';
            history.pushState("", document.title, window.location.pathname); // Nettoie l'URL
        };
    }

    // --- CHARGEMENT DES DONNÉES ---
    fetch('data/mèmes.json')
        .then(response => response.json())
        .then(data => {
            const mèmeType = pageType.replace('Favorites', ''); 
            const mèmes = data[mèmeType + 's']; 
            
            mèmes.forEach(mème => {
                const title = mème.title;
                const ext = mème.ext;
                const urlSlug = encodeURIComponent(title);
                
                let mediaPath = `image/mèmes/${mèmeType}s/${title}.${ext}`;
                let cardContent = (mèmeType === 'video') 
                    ? `<video><source src="${mediaPath}"></video>` 
                    : (mèmeType === 'audio') 
                    ? `<button class="button" data-sound="${mediaPath}">Play Sound</button>`
                    : `<img src="${mediaPath}">`;
                
                const cardHTML = document.createElement('div');
                cardHTML.classList.add('video-card');
                cardHTML.innerHTML = `
                    <div class="media-preview" style="cursor:pointer">
                        ${cardContent}
                    </div>
                    <div class="video-info">
                        <h3>${title}</h3>
                        <div class="video-actions">
                            <div class="add-to-favorites"></div>
                            <a class="download-button" href="${mediaPath}" download onclick="event.stopPropagation()"><img src="image/icones/telechargements.png"></a>
                            <img class="partage-button" src="image/icones/partager.png" style="cursor:pointer">
                        </div>
                    </div>
                `;
                
                // Clic sur la carte pour ouvrir la modal (uniquement Vidéo et Image)
                if (mèmeType !== 'audio') {
                    cardHTML.querySelector('.media-preview').onclick = () => {
                        window.location.hash = urlSlug;
                    };
                }

                // Bouton partage rapide
                cardHTML.querySelector('.partage-button').onclick = (e) => {
                    e.stopPropagation();
                    window.location.hash = urlSlug;
                };

                videoGrid.appendChild(cardHTML);

                const favoriteButton = cardHTML.querySelector('.add-to-favorites');
                updateFavoriteButton(favoriteButton, mème, pageType);
            });

            // Gestion des Audios
            if (mèmeType === 'audio') {
                document.querySelectorAll('.button').forEach(button => {
                    button.addEventListener('click', function(e) {
                        const soundFile = e.target.getAttribute('data-sound');
                        const audio = document.getElementById('audio'); 
                        if (audio) { audio.src = soundFile; audio.play(); }
                    });
                });
            }

            // --- GESTION DES ANCRES (#) AU CHARGEMENT ---
            const handleHash = () => {
                const hash = window.location.hash.substring(1);
                if (hash) {
                    const cleanHash = decodeURIComponent(hash);
                    const foundMeme = mèmes.find(m => m.title === cleanHash);
                    if (foundMeme) {
                        const path = `image/mèmes/${mèmeType}s/${foundMeme.title}.${foundMeme.ext}`;
                        openModal(foundMeme.title, path, mèmeType);
                    }
                }
            };

            window.addEventListener('hashchange', handleHash);
            handleHash(); // Vérification initiale

            if (typeof initializeSearch === 'function') initializeSearch();
        })
        .catch(error => console.error('Erreur:', error));
});
