document.documentElement.dataset.theme = localStorage.getItem('creative-theme') || 'dark';

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                display: ['Bebas Neue', 'sans-serif'],
                marker: ['Permanent Marker', 'cursive'],
                body: ['Inter', 'sans-serif']
            }
        }
    }
};
