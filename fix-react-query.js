const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Projects/smart_placement_tracker/client/src');
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace qc.invalidateQueries(['...']) or qc.invalidateQueries(['...', var])
    // We can use a regex that captures the array bracket content
    // pattern: invalidateQueries\(\[ (.*? ) \] \)
    
    const regex1 = /invalidateQueries\(\[\s*([^\]]+?)\s*\]\)/g;
    
    const newContent = content.replace(regex1, "invalidateQueries({ queryKey: [$1] })");
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated ${file}`);
        changedCount++;
    }
});

console.log(`Done! Updated ${changedCount} files.`);
