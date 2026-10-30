// ==========================================
// Showcase — Authentication JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ---- REGISTRATION FLOW ----
    const emailForm = document.getElementById('email-form');
    const otpForm = document.getElementById('otp-form');
    const usernameForm = document.getElementById('username-form');
    const passwordForm = document.getElementById('password-form');
    
    let registrationEmail = '';
    let registrationUsername = '';
    
    // Step indicators
    const stepDots = document.querySelectorAll('.step-dot');
    
    function showStep(stepId, dotIndex) {
        // Hide all steps
        document.querySelectorAll('.auth-step').forEach(step => {
            step.style.display = 'none';
        });
        // Show target step
        const target = document.getElementById(stepId);
        if (target) target.style.display = 'block';
        // Update dots
        stepDots.forEach((dot, i) => {
            if (i <= dotIndex) {
                dot.style.backgroundColor = '#E8725A';
            } else {
                dot.style.backgroundColor = '';
                dot.classList.add('bg-secondary', 'bg-opacity-25');
            }
        });
    }
    
    // Step 1: Send OTP
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('register-email');
            const email = emailInput.value.trim();
            const btn = emailForm.querySelector('button[type="submit"]');
            
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast('Please enter a valid email address.', 'error');
                return;
            }
            
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
            
            try {
                const res = await fetchJSON('/send-otp', {
                    method: 'POST',
                    body: { email }
                });
                registrationEmail = email;
                
                // Show email in OTP step
                const displayEmail = document.getElementById('display-email');
                if (displayEmail) displayEmail.textContent = email;
                
                const devBanner = document.getElementById('dev-otp-banner');
                const devValue = document.getElementById('dev-otp-value');

                if (res.dev_otp) {
                    showToast(`Dev Mode Code: ${res.dev_otp}`, 'info');
                    if (devBanner && devValue) {
                        devValue.textContent = res.dev_otp;
                        devBanner.classList.remove('d-none');
                    }
                    const digits = res.dev_otp.split('');
                    const inputs = document.querySelectorAll('.otp-input');
                    inputs.forEach((inp, idx) => {
                        if (digits[idx]) inp.value = digits[idx];
                    });
                } else {
                    if (devBanner) devBanner.classList.add('d-none');
                    showToast('OTP sent to your email!', 'success');
                }

                showStep('step-otp', 1);
                startResendCountdown();
                
                // Focus first OTP input
                const firstOtp = document.querySelector('.otp-input');
                if (firstOtp) firstOtp.focus();
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
    
    // Step 2: OTP verification
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        // Only allow digits
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            // Auto-submit when all 6 digits entered
            const otp = Array.from(otpInputs).map(i => i.value).join('');
            if (otp.length === 6) {
                submitOTP(otp);
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].value = '';
            }
        });
        
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
            if (pasted.length >= 6) {
                for (let i = 0; i < 6 && i < otpInputs.length; i++) {
                    otpInputs[i].value = pasted[i];
                }
                otpInputs[Math.min(5, otpInputs.length - 1)].focus();
                submitOTP(pasted.substring(0, 6));
            }
        });
    });
    
    async function submitOTP(otp) {
        try {
            await fetchJSON('/verify-otp', {
                method: 'POST',
                body: { email: registrationEmail, otp_code: otp }
            });
            showToast('Email verified!', 'success');
            showStep('step-username', 2);
            const usernameInput = document.getElementById('register-username');
            if (usernameInput) usernameInput.focus();
        } catch (error) {
            showToast(error.message, 'error');
            // Clear OTP inputs
            otpInputs.forEach(i => { i.value = ''; });
            if (otpInputs.length > 0) otpInputs[0].focus();
        }
    }
    
    if (otpForm) {
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otp = Array.from(otpInputs).map(i => i.value).join('');
            if (otp.length !== 6) {
                showToast('Please enter all 6 digits.', 'error');
                return;
            }
            submitOTP(otp);
        });
    }
    
    // Resend OTP countdown
    let resendInterval = null;
    function startResendCountdown() {
        const resendLink = document.getElementById('resend-otp');
        const timerSpan = document.getElementById('otp-timer');
        if (!resendLink) return;
        
        let timeLeft = 60;
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        
        if (resendInterval) clearInterval(resendInterval);
        
        resendInterval = setInterval(() => {
            timeLeft--;
            if (timerSpan) timerSpan.textContent = `(${timeLeft}s)`;
            if (timeLeft <= 0) {
                clearInterval(resendInterval);
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
                if (timerSpan) timerSpan.textContent = '';
            }
        }, 1000);
        
        resendLink.onclick = async (e) => {
            e.preventDefault();
            if (timeLeft > 0) return;
            try {
                const res = await fetchJSON('/send-otp', {
                    method: 'POST',
                    body: { email: registrationEmail }
                });
                const devBanner = document.getElementById('dev-otp-banner');
                const devValue = document.getElementById('dev-otp-value');

                if (res.dev_otp) {
                    showToast(`Dev Mode Code: ${res.dev_otp}`, 'info');
                    if (devBanner && devValue) {
                        devValue.textContent = res.dev_otp;
                        devBanner.classList.remove('d-none');
                    }
                    const digits = res.dev_otp.split('');
                    const inputs = document.querySelectorAll('.otp-input');
                    inputs.forEach((inp, idx) => {
                        if (digits[idx]) inp.value = digits[idx];
                    });
                } else {
                    if (devBanner) devBanner.classList.add('d-none');
                    showToast('OTP resent to your email!', 'success');
                }
                startResendCountdown();
            } catch (error) {
                showToast(error.message, 'error');
            }
        };
    }
    
    // Step 3: Username
    const usernameInput = document.getElementById('register-username');
    const usernameAvailability = document.getElementById('username-availability');
    const usernameContinueBtn = document.getElementById('username-continue');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', debounce(async () => {
            const username = usernameInput.value.trim();
            
            if (username.length < 3) {
                usernameAvailability.innerHTML = '<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>At least 3 characters</span>';
                if (usernameContinueBtn) usernameContinueBtn.disabled = true;
                return;
            }
            
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                usernameAvailability.innerHTML = '<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>Only letters, numbers, underscores</span>';
                if (usernameContinueBtn) usernameContinueBtn.disabled = true;
                return;
            }
            
            try {
                const res = await fetchJSON('/check-username', {
                    method: 'POST',
                    body: { username }
                });
                if (res.available) {
                    usernameAvailability.innerHTML = '<span class="text-success small"><i class="bi bi-check-circle me-1"></i>Available</span>';
                    registrationUsername = username;
                    if (usernameContinueBtn) usernameContinueBtn.disabled = false;
                } else {
                    usernameAvailability.innerHTML = '<span class="text-danger small"><i class="bi bi-x-circle me-1"></i>Username already taken</span>';
                    if (usernameContinueBtn) usernameContinueBtn.disabled = true;
                }
            } catch (error) {
                usernameAvailability.innerHTML = `<span class="text-danger small"><i class="bi bi-exclamation-triangle me-1"></i>${error.message}</span>`;
                if (usernameContinueBtn) usernameContinueBtn.disabled = true;
            }
        }, 400));
    }
    
    if (usernameForm) {
        usernameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (registrationUsername) {
                showStep('step-password', 3);
                const passInput = document.getElementById('register-password');
                if (passInput) passInput.focus();
            }
        });
    }
    
    // Step 4: Password
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const btn = passwordForm.querySelector('button[type="submit"]');
            
            if (password.length < 8) {
                showToast('Password must be at least 8 characters.', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match.', 'error');
                return;
            }
            
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
            
            try {
                const res = await fetchJSON('/create-account', {
                    method: 'POST',
                    body: {
                        username: registrationUsername,
                        password: password,
                        confirm_password: confirmPassword
                    }
                });
                showToast('Account created! Welcome to Showcase!', 'success');
                setTimeout(() => {
                    window.location.href = res.redirect || '/home';
                }, 500);
            } catch (error) {
                showToast(error.message, 'error');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
    
    // ---- LOGIN ----
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginId = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = loginForm.querySelector('button[type="submit"]');
            
            if (!loginId || !password) {
                showToast('Please fill in all fields.', 'error');
                return;
            }
            
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
            
            try {
                const res = await fetchJSON('/login', {
                    method: 'POST',
                    body: { login_id: loginId, password: password }
                });
                window.location.href = res.redirect || '/home';
            } catch (error) {
                showToast(error.message, 'error');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
});
