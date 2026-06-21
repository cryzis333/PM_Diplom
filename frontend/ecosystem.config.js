module.exports = {
	apps: [
		{
			name: 'pm-frontend-dev',
			script: 'npm',
			args: 'start',
			cwd: __dirname,
			env: {
				NODE_ENV: 'development',
				PORT: 3000
			},
			watch: false,
			autorestart: true,
			max_restarts: 10,
			restart_delay: 3000,
			error_file: './logs/frontend-err.log',
			out_file: './logs/frontend-out.log',
			combine_logs: true,
			env_production: {
				NODE_ENV: 'production'
			}
		},
		{
			name: 'pm-backend',
			script: 'app.py',
			cwd: '../backend/app',
			exec_interpreter: 'python',
			exec_mode: 'fork',
			env: {
				FLASK_ENV: 'development',
				PYTHONUNBUFFERED: '1'
			},
			watch: false,
			autorestart: true,
			max_restarts: 10,
			restart_delay: 3000,
			error_file: '../backend/app/logs/backend-err.log',
			out_file: '../backend/app/logs/backend-out.log',
			combine_logs: true,
			env_production: {
				FLASK_ENV: 'production'
			}
		}
	]
};
