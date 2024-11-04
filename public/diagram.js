document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("diagram-container");

    // Função para buscar dados dos funcionários
    fetch("/employees")
        .then(response => response.json())
        .then(data => {
            data.forEach(employee => {
                const card = createEmployeeCard(employee);
                container.appendChild(card);
            });
        })
        .catch(error => console.error("Erro ao carregar funcionários:", error));

    // Função para criar um card para cada funcionário
    function createEmployeeCard(employee) {
        const card = document.createElement("div");
        card.className = "employee-card";
        card.draggable = true;

        card.innerHTML = `
            <h3>${employee.name}</h3>
            <p>${employee.role}</p>
            <p>Salário: R$${employee.salary}</p>
        `;

        // Eventos de drag and drop
        card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", employee.id);
            e.target.classList.add("dragging");
        });

        card.addEventListener("dragend", (e) => {
            e.target.classList.remove("dragging");
        });

        return card;
    }

    // Eventos no container para permitir o rearranjo
    container.addEventListener("dragover", (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const dragging = document.querySelector(".dragging");
        if (afterElement == null) {
            container.appendChild(dragging);
        } else {
            container.insertBefore(dragging, afterElement);
        }
    });

    // Função para encontrar a posição correta de inserção
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".employee-card:not(.dragging)")];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
});
