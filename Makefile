package:
	web-ext build -s src -i demo --overwrite-dest

demo:
	cp src/options/index.html index.html
	sed -i '' -e 's|href="../img/|href="src/img/|g' index.html
	sed -i '' -e 's|src="scripts/theme.js"|src="src/options/theme.js"|g' index.html
	sed -i '' -e 's|href="/shoelace/|href="src/shoelace/|g' index.html
	sed -i '' -e 's|src="/shoelace/|src="src/shoelace/|g' index.html
	sed -i '' -e 's|href="styles.css"|href="src/options/styles.css"|g' index.html
	sed -i '' -e 's|src="/img/logo.svg"|src="src/img/logo.svg"|g' index.html
	sed -i '' -e 's|src="../utils/logger.js"|src="src/utils/logger.js"|g' index.html
	sed -i '' -e 's|src="../db/store.js"|src="src/db/store.js"|g' index.html
	sed -i '' -e 's|src="../db/idb-backup-and-restore.js"|src="src/db/idb-backup-and-restore.js"|g' index.html
	sed -i '' -e 's|src="../img/parts-of-a-url.png"|src="src/img/parts-of-a-url.png"|g' index.html
	sed -i '' -e 's|<script src="options.js"></script>|<script src="src/demo/icons.js"></script>\n    <script src="src/demo/demo.js"></script>\n    <script src="src/options/options.js"></script>|g' index.html
