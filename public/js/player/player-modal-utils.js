function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}
Object.assign(window, { closeModal });
export { closeModal, showModal };
