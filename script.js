const steps = Array.from(document.querySelectorAll('.form-step'));
const stepIndicators = Array.from(document.querySelectorAll('.steps-list__item'));
const backButton = document.querySelector('.button--secondary');
const nextButton = document.querySelector('.wizard__actions .button--primary[type="button"]');
const submitButton = document.querySelector('.wizard__actions .button--primary[type="submit"]');
const wizardForm = document.querySelector('.wizard__form');
const phoneInputs = document.querySelectorAll('#phone, #whatsapp');
const scheduleToggles = document.querySelectorAll('[data-schedule-toggle]');

let currentStep = 0;

function setStep(stepIndex) {
    currentStep = stepIndex;

    steps.forEach((step, index) => {
        const isActive = index === currentStep;
        step.hidden = !isActive;
        step.classList.toggle('form-step--active', isActive);
    });

    stepIndicators.forEach((indicator, index) => {
        const isActive = index === currentStep;
        indicator.classList.toggle('steps-list__item--active', isActive);

        if (isActive) {
            indicator.setAttribute('aria-current', 'step');
        } else {
            indicator.removeAttribute('aria-current');
        }
    });

    backButton.disabled = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;

    const firstFocusable = steps[currentStep]?.querySelector('input, textarea, button');
    if (firstFocusable) {
        firstFocusable.focus();
    }
}

function clearFieldError(fieldWrapper) {
    if (!fieldWrapper) {
        return;
    }

    fieldWrapper.classList.remove('field--error', 'schedule-item--error');

    const controls = fieldWrapper.querySelectorAll('input, textarea');
    controls.forEach((control) => {
        control.removeAttribute('aria-invalid');

        const describedBy = control.getAttribute('aria-describedby');
        if (!describedBy) {
            return;
        }

        const filteredIds = describedBy
            .split(' ')
            .filter((id) => id && !id.endsWith('-error'));

        if (filteredIds.length > 0) {
            control.setAttribute('aria-describedby', filteredIds.join(' '));
        } else {
            control.removeAttribute('aria-describedby');
        }
    });

    const errorMessage = fieldWrapper.querySelector('.field__error-message');
    if (errorMessage) {
        errorMessage.remove();
    }

    delete fieldWrapper.dataset.errorId;
}

function showFieldError(fieldWrapper, message) {
    if (!fieldWrapper) {
        return;
    }

    clearFieldError(fieldWrapper);

    const errorElement = document.createElement('small');
    const errorId = `field-${Math.random().toString(36).slice(2, 10)}-error`;

    errorElement.className = 'field__error-message';
    errorElement.textContent = message;
    errorElement.id = errorId;
    errorElement.setAttribute('role', 'alert');
    fieldWrapper.dataset.errorId = errorId;

    if (fieldWrapper.classList.contains('schedule-item')) {
        fieldWrapper.classList.add('schedule-item--error');
    } else {
        fieldWrapper.classList.add('field--error');
    }

    const controls = fieldWrapper.querySelectorAll('input, textarea');
    controls.forEach((control) => {
        control.setAttribute('aria-invalid', 'true');

        const describedBy = control.getAttribute('aria-describedby');
        const ids = describedBy ? describedBy.split(' ').filter(Boolean) : [];

        if (!ids.includes(errorId)) {
            ids.push(errorId);
            control.setAttribute('aria-describedby', ids.join(' '));
        }
    });

    fieldWrapper.appendChild(errorElement);
}

function validateTextLikeField(input) {
    const wrapper = input.closest('.field');
    clearFieldError(wrapper);

    if (!input.hasAttribute('required')) {
        return true;
    }

    if (input.value.trim() === '') {
        showFieldError(wrapper, 'Preencha este campo para continuar.');
        return false;
    }

    return true;
}

function validatePhoneField(input) {
    const wrapper = input.closest('.field');
    clearFieldError(wrapper);

    if (!validateTextLikeField(input)) {
        return false;
    }

    const digits = input.value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
        showFieldError(wrapper, 'Digite um telefone valido com DDD.');
        return false;
    }

    return true;
}

function validateEmailField(input) {
    const wrapper = input.closest('.field');
    clearFieldError(wrapper);

    if (!validateTextLikeField(input)) {
        return false;
    }

    if (input.value && !input.checkValidity()) {
        showFieldError(wrapper, 'Digite um e-mail valido.');
        return false;
    }

    return true;
}

function validateCheckboxGroup(step) {
    const groups = new Map();
    const checkboxes = step.querySelectorAll('input[type="checkbox"]:not([data-schedule-toggle])');

    checkboxes.forEach((checkbox) => {
        const groupName = checkbox.name;
        if (!groups.has(groupName)) {
            groups.set(groupName, []);
        }

        groups.get(groupName).push(checkbox);
    });

    let isValid = true;

    groups.forEach((groupInputs) => {
        const firstCard = groupInputs[0].closest('.form-group');
        const checkedCount = groupInputs.filter((input) => input.checked).length;

        clearFieldError(firstCard);

        if (checkedCount === 0) {
            showFieldError(firstCard, 'Selecione pelo menos uma opcao.');
            isValid = false;
        }
    });

    return isValid;
}

function validateScheduleStep(step) {
    const scheduleItems = step.querySelectorAll('.schedule-item');
    let isValid = true;

    scheduleItems.forEach((item) => {
        clearFieldError(item);

        const isClosed = item.querySelector('[data-schedule-toggle]')?.checked;
        const timeInputs = item.querySelectorAll('.schedule-item__inputs select');
        const [openInput, closeInput] = timeInputs;
        const hasOpen = openInput.value !== '';
        const hasClose = closeInput.value !== '';

        if (isClosed) {
            return;
        }

        if (!hasOpen && !hasClose) {
            showFieldError(item, 'Selecione os horarios ou marque este dia como fechado.');
            isValid = false;
            return;
        }

        if (hasOpen !== hasClose) {
            showFieldError(item, 'Preencha os dois horarios ou deixe ambos vazios.');
            isValid = false;
            return;
        }

        if (hasOpen && hasClose && openInput.value >= closeInput.value) {
            showFieldError(item, 'O horario de fechamento deve ser maior que o de abertura.');
            isValid = false;
        }
    });

    return isValid;
}

function validateCurrentStep() {
    const activeStep = steps[currentStep];
    const requiredInputs = activeStep.querySelectorAll('input:not([type="checkbox"]):not([type="file"]), textarea');
    let isValid = true;

    requiredInputs.forEach((input) => {
        let fieldValid = true;

        if (input.type === 'email') {
            fieldValid = validateEmailField(input);
        } else if (input.type === 'tel') {
            fieldValid = validatePhoneField(input);
        } else {
            fieldValid = validateTextLikeField(input);
        }

        if (!fieldValid) {
            isValid = false;
        }
    });

    if (activeStep.querySelector('.schedule-list') && !validateScheduleStep(activeStep)) {
        isValid = false;
    }

    if (activeStep.querySelector('input[type="checkbox"]:not([data-schedule-toggle])') && !validateCheckboxGroup(activeStep)) {
        isValid = false;
    }

    return isValid;
}

function moveToNextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    if (currentStep < steps.length - 1) {
        setStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function moveToPreviousStep() {
    if (currentStep > 0) {
        setStep(currentStep - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function formatPhoneValue(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) {
        return digits ? `(${digits}` : '';
    }

    if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function applyPhoneMask(event) {
    const input = event.target;
    input.value = formatPhoneValue(input.value);
}

function updateScheduleState(toggle) {
    const scheduleItem = toggle.closest('.schedule-item');
    const timeInputs = scheduleItem.querySelectorAll('.schedule-item__inputs select');
    const isClosed = toggle.checked;

    scheduleItem.classList.toggle('schedule-item--closed', isClosed);
    toggle.setAttribute('aria-expanded', String(!isClosed));

    timeInputs.forEach((input) => {
        input.disabled = isClosed;

        if (isClosed) {
            input.value = '';
            input.removeAttribute('aria-invalid');
        }
    });

    clearFieldError(scheduleItem);
}

nextButton.addEventListener('click', moveToNextStep);
backButton.addEventListener('click', moveToPreviousStep);

phoneInputs.forEach((input) => {
    input.addEventListener('input', applyPhoneMask);
    input.value = formatPhoneValue(input.value);
});

scheduleToggles.forEach((toggle) => {
    toggle.addEventListener('change', () => updateScheduleState(toggle));
    updateScheduleState(toggle);
});

wizardForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }
    window.location.href = './success.html';
});

wizardForm.addEventListener('input', (event) => {
    const { target } = event;

    if (target.matches('input, textarea')) {
        const wrapper = target.closest('.field, .schedule-item, .form-group');
        clearFieldError(wrapper);
    }
});

setStep(0);
