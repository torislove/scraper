const { generateLocalities } = require('./src/utils/intelligentExtractor');

async function run() {
    console.log("Testing Guntur:");
    try {
        const res = await generateLocalities("guntur");
        console.log(res);
    } catch (e) {
        console.error(e);
    }
}
run();
