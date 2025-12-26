// Main Application
class MockTestApp {
    constructor() {
        this.testsData = null;
        this.currentTest = null;
        this.currentQuestion = 0;
        this.userAnswers = {};
        this.timer = null;
        this.timeRemaining = 0;
        this.isReviewMode = false;
        
        this.init();
    }
    
    async init() {
        await this.loadTestsData();
        this.renderHomePage();
        this.setupEventListeners();
    }
    
    async loadTestsData() {
        try {
            // Load tests configuration
            const response = await fetch('tests.json');
            this.testsData = await response.json();
        } catch (error) {
            console.error('Error loading tests data:', error);
            // Fallback data
            this.testsData = {
                fullTests: [
                    {
                        id: 'full-1',
                        title: 'Full Mock Test 1',
                        description: 'Complete test covering all subjects',
                        duration: 120, // minutes
                        questions: 100,
                        subjects: ['All'],
                        file: 'full-test-1.json',
                        negativeMarking: 0.25
                    }
                ],
                subjects: [
                    {
                        id: 'math',
                        name: 'Mathematics',
                        description: 'Quantitative aptitude questions',
                        tests: [
                            {
                                id: 'math-1',
                                title: 'Math Sectional Test 1',
                                description: 'Practice math questions',
                                duration: 30,
                                questions: 30,
                                file: 'math-test-1.json'
                            }
                        ]
                    },
                    {
                        id: 'reasoning',
                        name: 'Reasoning',
                        description: 'Logical reasoning questions',
                        tests: [
                            {
                                id: 'reasoning-1',
                                title: 'Reasoning Test 1',
                                description: 'Practice reasoning questions',
                                duration: 30,
                                questions: 30,
                                file: 'reasoning-test-1.json'
                            }
                        ]
                    }
                ]
            };
        }
    }
    
    renderHomePage() {
        // Render full tests
        const fullTestsGrid = document.getElementById('fullTests');
        fullTestsGrid.innerHTML = this.testsData.fullTests.map(test => `
            <div class="test-card full" data-test-id="${test.id}" data-type="full">
                <div class="icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h3>${test.title}</h3>
                <div class="meta">
                    <span><i class="fas fa-clock"></i> ${test.duration} min</span>
                    <span><i class="fas fa-question-circle"></i> ${test.questions} Qs</span>
                    <span><i class="fas fa-balance-scale"></i> -${test.negativeMarking || 0.25}</span>
                </div>
                <p class="description">${test.description}</p>
                <div class="start-btn">Start Test</div>
            </div>
        `).join('');
        
        // Render subjects
        const subjectList = document.getElementById('subjectList');
        subjectList.innerHTML = this.testsData.subjects.map((subject, index) => `
            <div class="subject-item ${index === 0 ? 'active' : ''}" 
                 data-subject-id="${subject.id}">
                ${subject.name}
            </div>
        `).join('');
        
        // Render tests for first subject
        this.renderSectionalTests(this.testsData.subjects[0].id);
    }
    
    renderSectionalTests(subjectId) {
        const subject = this.testsData.subjects.find(s => s.id === subjectId);
        const sectionalTestsGrid = document.getElementById('sectionalTests');
        
        if (subject) {
            sectionalTestsGrid.innerHTML = subject.tests.map(test => `
                <div class="test-card sectional" data-test-id="${test.id}" data-type="sectional">
                    <div class="icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <h3>${test.title}</h3>
                    <div class="meta">
                        <span><i class="fas fa-clock"></i> ${test.duration} min</span>
                        <span><i class="fas fa-question-circle"></i> ${test.questions} Qs</span>
                        <span><i class="fas fa-book"></i> ${subject.name}</span>
                    </div>
                    <p class="description">${test.description}</p>
                    <div class="start-btn">Start Test</div>
                </div>
            `).join('');
        }
    }
    
    async startTest(testId, testType) {
        try {
            let testConfig;
            
            if (testType === 'full') {
                testConfig = this.testsData.fullTests.find(t => t.id === testId);
            } else {
                for (const subject of this.testsData.subjects) {
                    const test = subject.tests.find(t => t.id === testId);
                    if (test) {
                        testConfig = test;
                        testConfig.subject = subject.name;
                        break;
                    }
                }
            }
            
            if (!testConfig) {
                alert('Test not found!');
                return;
            }
            
            // Load test questions
            const response = await fetch(`tests/${testConfig.file}`);
            const testData = await response.json();
            
            this.currentTest = {
                ...testConfig,
                ...testData
            };
            
            this.currentQuestion = 0;
            this.userAnswers = {};
            this.isReviewMode = false;
            this.timeRemaining = this.currentTest.duration * 60; // Convert to seconds
            
            // Switch to test page
            document.getElementById('homePage').classList.remove('active');
            document.getElementById('testPage').classList.add('active');
            
            this.renderTestPage();
            this.startTimer();
            
        } catch (error) {
            console.error('Error starting test:', error);
            alert('Failed to load test. Please try again.');
        }
    }
    
    renderTestPage() {
        const testPage = document.getElementById('testPage');
        
        testPage.innerHTML = `
            <div class="test-header">
                <div class="header-content">
                    <div class="test-info">
                        <h2>${this.currentTest.title}</h2>
                        <p>${this.currentTest.subject || 'Full Test'}</p>
                    </div>
                    <div class="test-stats">
                        <div class="progress">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressFill" style="width: 0%"></div>
                            </div>
                            <span id="progressText">0/${this.currentTest.questions.length}</span>
                        </div>
                        <div class="timer" id="timer">${this.formatTime(this.timeRemaining)}</div>
                    </div>
                </div>
            </div>
            
            <div class="test-container">
                <div class="question-panel">
                    <div class="question-header">
                        <div class="question-number">
                            Question <span id="currentQNumber">1</span> of ${this.currentTest.questions.length}
                        </div>
                    </div>
                    <div id="questionText" class="question-text"></div>
                    <div id="options" class="options"></div>
                    <div id="explanation" class="explanation" style="display: none; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;"></div>
                </div>
                
                <div class="sidebar">
                    <div class="palette">
                        <h3>Question Palette</h3>
                        <div id="questionGrid" class="question-grid"></div>
                    </div>
                    
                    <div class="test-summary">
                        <div class="summary-item">
                            <span>Total Questions:</span>
                            <span>${this.currentTest.questions.length}</span>
                        </div>
                        <div class="summary-item">
                            <span>Answered:</span>
                            <span id="answeredCount">0</span>
                        </div>
                        <div class="summary-item">
                            <span>Marked for Review:</span>
                            <span id="markedCount">0</span>
                        </div>
                        <div class="summary-item">
                            <span>Time Remaining:</span>
                            <span id="timeRemainingText">${this.formatTime(this.timeRemaining)}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <button class="control-btn" id="markReviewBtn" style="width: 100%; margin-bottom: 10px;">
                            Mark for Review
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="controls">
                <div class="controls-content">
                    <div>
                        <button class="control-btn prev" id="prevBtn">Previous</button>
                        <button class="control-btn next" id="nextBtn">Next</button>
                    </div>
                    <button class="control-btn submit" id="submitBtn">Submit Test</button>
                </div>
            </div>
            
            <!-- Submit Modal -->
            <div class="modal" id="submitModal">
                <div class="modal-content">
                    <h3>Submit Test?</h3>
                    <p>You have attempted <span id="attemptedCount">0</span> out of ${this.currentTest.questions.length} questions.</p>
                    <p>Are you sure you want to submit?</p>
                    <div class="modal-buttons">
                        <button class="control-btn prev" id="cancelSubmit">Cancel</button>
                        <button class="control-btn submit" id="confirmSubmit">Submit</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderQuestion();
        this.renderQuestionPalette();
        this.updateProgress();
        this.setupTestEventListeners();
    }
    
    renderQuestion() {
        const question = this.currentTest.questions[this.currentQuestion];
        const userAnswer = this.userAnswers[this.currentQuestion];
        
        // Update question number
        document.getElementById('currentQNumber').textContent = this.currentQuestion + 1;
        
        // Render question text
        document.getElementById('questionText').innerHTML = `
            ${question.text}
            ${question.image ? `<img src="${question.image}" style="max-width: 100%; margin-top: 15px; border-radius: 8px;">` : ''}
        `;
        
        // Render options
        const optionsDiv = document.getElementById('options');
        optionsDiv.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            
            if (this.isReviewMode) {
                if (index === question.correctAnswer) {
                    optionDiv.classList.add('correct');
                } else if (index === userAnswer && userAnswer !== question.correctAnswer) {
                    optionDiv.classList.add('incorrect');
                }
            } else if (userAnswer === index) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.innerHTML = `
                <div class="option-marker">${String.fromCharCode(65 + index)}</div>
                <div class="option-text">${option}</div>
            `;
            
            if (!this.isReviewMode) {
                optionDiv.addEventListener('click', () => this.selectOption(index));
            }
            
            optionsDiv.appendChild(optionDiv);
        });
        
        // Render explanation if in review mode
        const explanationDiv = document.getElementById('explanation');
        if (this.isReviewMode && question.explanation) {
            explanationDiv.innerHTML = `<strong>Explanation:</strong> ${question.explanation}`;
            explanationDiv.style.display = 'block';
        } else {
            explanationDiv.style.display = 'none';
        }
        
        // Update question palette
        this.updateQuestionPalette();
    }
    
    selectOption(optionIndex) {
        this.userAnswers[this.currentQuestion] = optionIndex;
        this.renderQuestion();
        this.updateProgress();
    }
    
    renderQuestionPalette() {
        const grid = document.getElementById('questionGrid');
        grid.innerHTML = '';
        
        this.currentTest.questions.forEach((_, index) => {
            const button = document.createElement('button');
            button.className = 'q-btn';
            button.textContent = index + 1;
            
            if (index === this.currentQuestion) {
                button.classList.add('current');
            }
            
            if (this.userAnswers[index] !== undefined) {
                button.classList.add('answered');
            }
            
            button.addEventListener('click', () => this.goToQuestion(index));
            
            grid.appendChild(button);
        });
    }
    
    updateQuestionPalette() {
        const buttons = document.querySelectorAll('#questionGrid .q-btn');
        
        buttons.forEach((button, index) => {
            button.classList.remove('current', 'answered', 'marked');
            
            if (index === this.currentQuestion) {
                button.classList.add('current');
            }
            
            if (this.userAnswers[index] !== undefined) {
                button.classList.add('answered');
            }
        });
        
        // Update counts
        const answeredCount = Object.keys(this.userAnswers).length;
        document.getElementById('answeredCount').textContent = answeredCount;
    }
    
    goToQuestion(index) {
        this.currentQuestion = index;
        this.renderQuestion();
    }
    
    nextQuestion() {
        if (this.currentQuestion < this.currentTest.questions.length - 1) {
            this.currentQuestion++;
            this.renderQuestion();
        }
    }
    
    prevQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.renderQuestion();
        }
    }
    
    updateProgress() {
        const answeredCount = Object.keys(this.userAnswers).length;
        const totalQuestions = this.currentTest.questions.length;
        const percentage = (answeredCount / totalQuestions) * 100;
        
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `${answeredCount}/${totalQuestions}`;
    }
    
    startTimer() {
        if (this.timer) clearInterval(this.timer);
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            const timerElement = document.getElementById('timer');
            const timeRemainingElement = document.getElementById('timeRemainingText');
            
            if (timerElement) {
                timerElement.textContent = this.formatTime(this.timeRemaining);
                timerElement.className = 'timer';
                
                if (this.timeRemaining <= 300) { // 5 minutes
                    timerElement.classList.add('warning');
                }
                if (this.timeRemaining <= 60) { // 1 minute
                    timerElement.classList.add('danger');
                }
            }
            
            if (timeRemainingElement) {
                timeRemainingElement.textContent = this.formatTime(this.timeRemaining);
            }
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                this.submitTest();
            }
        }, 1000);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    submitTest() {
        clearInterval(this.timer);
        this.showResults();
    }
    
    showResults() {
        // Calculate score
        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;
        let totalMarks = 0;
        
        this.currentTest.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            
            if (userAnswer === undefined) {
                unattempted++;
            } else if (userAnswer === question.correctAnswer) {
                correct++;
                totalMarks += 1;
            } else {
                incorrect++;
                totalMarks -= (this.currentTest.negativeMarking || 0.25);
            }
        });
        
        const accuracy = correct / (correct + incorrect) * 100 || 0;
        
        // Update test page to show results
        document.querySelector('.question-panel').innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <h2 style="color: var(--primary); margin-bottom: 30px;">Test Results</h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
                    <div class="stat-card" style="background: linear-gradient(135deg, #4cc9f0, #4361ee);">
                        <div class="stat-value">${correct}</div>
                        <div class="stat-label">Correct</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #f72585, #7209b7);">
                        <div class="stat-value">${incorrect}</div>
                        <div class="stat-label">Incorrect</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #f8961e, #f9c74f);">
                        <div class="stat-value">${unattempted}</div>
                        <div class="stat-label">Unattempted</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #2a9d8f, #4cc9f0);">
                        <div class="stat-value">${totalMarks.toFixed(2)}</div>
                        <div class="stat-label">Total Marks</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h3 style="color: var(--primary); margin-bottom: 15px;">Performance Summary</h3>
                    <p>Accuracy: <strong>${accuracy.toFixed(1)}%</strong></p>
                    <p>Time Taken: <strong>${this.formatTime((this.currentTest.duration * 60) - this.timeRemaining)}</strong></p>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="control-btn prev" id="reviewBtn">
                        <i class="fas fa-search"></i> Review Answers
                    </button>
                    <button class="control-btn next" id="retryBtn">
                        <i class="fas fa-redo"></i> Retry Test
                    </button>
                    <button class="control-btn next" id="homeBtn">
                        <i class="fas fa-home"></i> Back to Home
                    </button>
                </div>
            </div>
        `;
        
        // Update sidebar to show question-wise status
        this.isReviewMode = true;
        this.renderQuestionPalette();
        
        // Add event listeners for result buttons
        document.getElementById('reviewBtn')?.addEventListener('click', () => {
            this.currentQuestion = 0;
            this.isReviewMode = true;
            this.renderQuestion();
        });
        
        document.getElementById('retryBtn')?.addEventListener('click', () => {
            this.startTest(this.currentTest.id, this.currentTest.subject ? 'sectional' : 'full');
        });
        
        document.getElementById('homeBtn')?.addEventListener('click', () => {
            document.getElementById('testPage').classList.remove('active');
            document.getElementById('homePage').classList.add('active');
        });
    }
    
    setupEventListeners() {
        // Test card click events
        document.addEventListener('click', (e) => {
            const testCard = e.target.closest('.test-card');
            if (testCard) {
                const testId = testCard.dataset.testId;
                const testType = testCard.dataset.type;
                this.startTest(testId, testType);
            }
            
            // Subject selection
            const subjectItem = e.target.closest('.subject-item');
            if (subjectItem) {
                document.querySelectorAll('.subject-item').forEach(item => {
                    item.classList.remove('active');
                });
                subjectItem.classList.add('active');
                this.renderSectionalTests(subjectItem.dataset.subjectId);
            }
        });
    }
    
    setupTestEventListeners() {
        // Navigation buttons
        document.getElementById('prevBtn')?.addEventListener('click', () => this.prevQuestion());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextQuestion());
        
        // Submit button
        document.getElementById('submitBtn')?.addEventListener('click', () => {
            const attempted = Object.keys(this.userAnswers).length;
            document.getElementById('attemptedCount').textContent = attempted;
            document.getElementById('submitModal').style.display = 'flex';
        });
        
        // Submit modal buttons
        document.getElementById('cancelSubmit')?.addEventListener('click', () => {
            document.getElementById('submitModal').style.display = 'none';
        });
        
        document.getElementById('confirmSubmit')?.addEventListener('click', () => {
            document.getElementById('submitModal').style.display = 'none';
            this.submitTest();
        });
        
        // Mark for review
        document.getElementById('markReviewBtn')?.addEventListener('click', () => {
            const button = document.getElementById('markReviewBtn');
            if (button.textContent.includes('Mark')) {
                button.innerHTML = '<i class="fas fa-check"></i> Marked for Review';
                button.style.background = 'var(--warning)';
                
                const qBtn = document.querySelector(`#questionGrid .q-btn:nth-child(${this.currentQuestion + 1})`);
                if (qBtn) {
                    qBtn.classList.add('marked');
                }
            } else {
                button.innerHTML = 'Mark for Review';
                button.style.background = '';
                
                const qBtn = document.querySelector(`#questionGrid .q-btn:nth-child(${this.currentQuestion + 1})`);
                if (qBtn) {
                    qBtn.classList.remove('marked');
                }
            }
        });
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MockTestApp();
});