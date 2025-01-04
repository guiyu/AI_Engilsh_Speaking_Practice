export class AdsService {
    constructor() {
        this.adLink = null;
        this.adContent = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.adLink = document.getElementById('ad-link');
        this.adContent = document.querySelector('.ad-text');
        
        if (this.adLink && this.adContent) {
            this.updateAd({
                url: 'https://your-ad-link.com',
                text: 'Custom Advertisement Message'
            });
            this.initialized = true;
        }
    }

    updateAd(adData) {
        if (this.adLink) {
            this.adLink.href = adData.url;
        }
        if (this.adContent) {
            this.adContent.textContent = adData.text;
        }
    }
}