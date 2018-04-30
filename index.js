/* global ngapp, xelib, registerPatcher */

const targetMaterials = ['Elven', 'Dwarven', 'Orcish'];

const levelShifts = {
    'Elven': -7,
    'Dwarven': -6,
    'Orcish': 13
};

let fixLevel = function(entry, material, name, log) {
    let level = xelib.GetIntValue(entry, 'LVLO\\Level'),
        shift = levelShifts[material];
    if (level === 25) shift--;
    if (level === 11) shift++;
    log(`  Changing level for entry ${name} from ${level} to ${level + shift}`);
    xelib.SetIntValue(entry, 'LVLO\\Level', level + shift);
};

let getMaterialEntry = function(equipment, name) {
    for (let material of Object.keys(equipment)) {
        let entry = equipment[material].find(e => e === name);
        if (entry) return material;
    }
};

let getMaterial = function(rec) {
    let keywords = xelib.GetElements(rec, 'KWDA').map(e => xelib.GetValue(e));
    for (let keyword of keywords) {
        let match = keyword.match(/(Armor|Weap)Material(\S+)/);
        if (match) return match[2];
    }
};

let addEquipment = function(equipment, rec) {
    let material = getMaterial(rec);
    if (!targetMaterials.includes(material)) return;
    if (!equipment.hasOwnProperty(material)) equipment[material] = [];
    equipment[material].push(xelib.LongName(rec));
};

let patchLeveledItem = function(patch, record, helpers, locals) {
    if (!xelib.HasElement(record, 'Leveled List Entries')) return;
    record = xelib.CopyElement(record, patch);
    helpers.logMessage(`Patching ${xelib.Name(record)}`);
    let entries = xelib.GetElements(record, 'Leveled List Entries');
    entries.forEach(entry => {
        let item = xelib.GetValue(entry, 'LVLO\\Reference'),
            material = getMaterialEntry(locals.equipment, item);
        if (!material) return;
        fixLevel(entry, material, item, helpers.logMessage);
    });
}

registerPatcher({
    info: info,
    gameModes: [xelib.gmTES5, xelib.gmSSE],
    settings: {
        label: 'WAFR Patcher',
        templateUrl: `${patcherPath}/partials/settings.html`,
        defaultSettings: {}
    },
    requiredFiles: [],
    getFilesToPatch: function(filenames) {
        let excludedFiles = [
            'Skyrim.esm', 
            'Update.esm', 
            'Dawnguard.esm', 
            'HearthFires.esm', 
            'Dragonborn.esm',
            'Weapon AF.esp',
            'Weapon & Armor Fixes_Remade.esp'
        ];
        for (let i = filenames.length - 1; i >= 0; i--) {
            if (!excludedFiles.includes(filenames[i])) continue;
            filenames.splice(i, 1);
        }
    },
    execute: {
        initialize: function(patch, helpers, settings, locals) {
            let equipment = helpers.loadRecords('WEAP,ARMO');
            locals.equipment = {};
            equipment.forEach(function(rec) {
                if (!xelib.IsMaster(rec)) return;
                addEquipment(locals.equipment, rec);
            });
            let leveledItems = helpers.loadRecords('LVLI', true);
            leveledItems.forEach(record => {
                patchLeveledItem(patch, record, helpers, locals);
            })
        },
        process: []
    }
});