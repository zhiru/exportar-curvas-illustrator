(function() {
    // *******************************************************
    // Exportador PDF Aireset
    // Modo único (.ai aberto) ou lote (sem .ai aberto)
    // *******************************************************
    #target illustrator

    // Ajustes da logo
    var LOGO_WIDTH = 200, LOGO_HEIGHT = 50;
    var logoPath = File($.fileName).parent + "/logo.png";

    // Captura todos os .ai de uma pasta
    function getAiFiles(folder) {
        var f = new Folder(folder);
        if (!f.exists) return [];
        return f.getFiles(function(file) {
            return (file instanceof File) && file.name.match(/\.ai$/i);
        });
    }

    // Exporta UM documento .ai para PDF
    function exportAiToPDF(aiFile, prefix, sufix, vetorizar, semGrupos, camadaUnica) {
        try {
            var doc = app.open(aiFile);
            var nomeDoc = doc.name.replace(/\.ai$/i, "");
            var outPDF = new File(doc.fullName.parent.fsName + "/" +
                                  (prefix||"") + nomeDoc + (sufix||"") + ".pdf");

            // vetorizar textos
            if (vetorizar) {
                for (var j = doc.textFrames.length - 1; j >= 0; j--) {
                    try { doc.textFrames[j].createOutline(); } catch(e){}
                }
            }
            if (semGrupos)    removeAllGroups(doc);
            if (camadaUnica)  mergeToSingleLayer(doc);

            var pdfOpts = new PDFSaveOptions();
            pdfOpts.preserveEditability = false;
            pdfOpts.artboardRange = "1-" + doc.artboards.length;

            doc.saveAs(outPDF, pdfOpts);
            doc.close(SaveOptions.DONOTSAVECHANGES);
            return true;
        } catch (err) {
            alert("Erro ao exportar: " + aiFile.name + "\n" + err);
            return false;
        }
    }

    // Remove todos os grupos do doc
    function removeAllGroups(doc) {
        for (var i = doc.groupItems.length - 1; i >= 0; i--) {
            try {
                doc.groupItems[i].selected = true;
                app.executeMenuCommand("ungroup");
            } catch(e){}
        }
        doc.selection = null;
    }

    // Junta tudo em uma única camada
    function mergeToSingleLayer(doc) {
        if (doc.layers.length <= 1) return;
        var base = doc.layers[0];
        for (var i = doc.layers.length - 1; i > 0; i--) {
            var l = doc.layers[i];
            for (var j = l.pageItems.length - 1; j >= 0; j--) {
                l.pageItems[j].move(base, ElementPlacement.PLACEATEND);
            }
            l.remove();
        }
    }

    // -------------------------------------------------------
    // UI de exportação para documento aberto (singleFileUI)
    // -------------------------------------------------------
    function singleFileUI(doc) {
        var w = new Window("dialog", "Exportador PDF Aireset");
        w.orientation = "column";
        w.alignChildren = "center";

        // Logo
        var logoPanel = w.add('panel', undefined, '');
        logoPanel.preferredSize = [LOGO_WIDTH, LOGO_HEIGHT];
        logoPanel.margins = [0,0,0,0];
        logoPanel.alignment = "center";
        try {
            var logoImg = logoPanel.add("image", undefined, logoPath);
            logoImg.size = [LOGO_WIDTH, LOGO_HEIGHT];
        } catch(e) {
            logoPanel.add('statictext', undefined, "LOGO NÃO ENCONTRADA!");
        }

        var optGroup = w.add("panel", undefined, "Opções de Exportação");
        optGroup.orientation = "column";
        optGroup.alignChildren = "left";

        // Prefixo
        var prefixGrp = optGroup.add("group");
        prefixGrp.add("statictext", undefined, "Prefixo:");
        var prefix = prefixGrp.add("edittext", undefined, "");
        prefix.characters = 15;

        // Sufixo
        var sufixGrp = optGroup.add("group");
        sufixGrp.add("statictext", undefined, "Sufixo:");
        var sufix = sufixGrp.add("edittext", undefined, "");
        sufix.characters = 15;

        // --- AQUI VEM O CAMPO MULTILINHA PRA PRÉ-VISUALIZAR O NOME ---
        var filenameGrp = optGroup.add("group");
        filenameGrp.orientation = "column";
        filenameGrp.alignChildren = "left";
        filenameGrp.add("statictext", undefined, "Nome final do PDF:");

        var fileNameBox = filenameGrp.add("edittext", undefined, "", {multiline:true, readonly:true});
        fileNameBox.size = [340, 38]; // <- ajuste aqui largura x altura

        function updateFilenameBox() {
            var nomeDoc = doc.name.replace(/\.ai$/i, "");
            var nomeFinal = (prefix.text || "") + nomeDoc + (sufix.text || "") + ".pdf";
            fileNameBox.text = nomeFinal;
        }
        updateFilenameBox();
        prefix.onChanging = updateFilenameBox;
        sufix.onChanging = updateFilenameBox;
        // ------------------------------------------------------------

        var vetorizar   = optGroup.add("checkbox", undefined, "Vetorizar todos os textos?");
        var semGrupos   = optGroup.add("checkbox", undefined, "Remover todos os grupos");
        var camadaUnica = optGroup.add("checkbox", undefined, "Mesclar tudo em uma camada só");

        var btns = w.add("group");
        btns.alignment = "center";
        var exportBtn = btns.add("button", undefined, "Exportar PDF único");
        var closeBtn  = btns.add("button", undefined, "Fechar");

        exportBtn.onClick = function() {
            var aiFile = File(doc.fullName);
            exportAiToPDF(aiFile,
                          prefix.text, sufix.text,
                          vetorizar.value, semGrupos.value, camadaUnica.value);
            // abre pasta de saída
            Folder(doc.fullName.parent.fsName).execute();
            w.close();
        };

        closeBtn.onClick = function() { w.close(); };
        w.show();
    }

    // -------------------------------------------------------
    // UI de exportação em lote (batchUI)
    // -------------------------------------------------------
    function batchUI() {
        var w = new Window("dialog", "Exportar PDFs em lote - Aireset");
        w.orientation = "column";
        w.alignChildren = "center";

        // Logo
        var logoPanel = w.add('panel', undefined, '');
        logoPanel.preferredSize = [LOGO_WIDTH, LOGO_HEIGHT];
        logoPanel.margins = [0,0,0,0];
        logoPanel.alignment = "center";
        try {
            var logoImg = logoPanel.add("image", undefined, logoPath);
            logoImg.size = [LOGO_WIDTH, LOGO_HEIGHT];
        } catch(e) {
            logoPanel.add('statictext', undefined, "LOGO NÃO ENCONTRADA!");
        }

        // Pasta
        var pastaGrp = w.add("group");
        pastaGrp.add("statictext", undefined, "Pasta com arquivos .AI:");
        var pasta = pastaGrp.add("edittext", undefined, "");
        pasta.characters = 30;
        var browseBtn = pastaGrp.add("button", undefined, "Selecionar");
        browseBtn.onClick = function() {
            var f = Folder.selectDialog("Selecione a pasta com os arquivos .AI");
            if (f) pasta.text = f.fsName;
        };

        // Opções
        var optGroup = w.add("panel", undefined, "Opções de Exportação");
        optGroup.orientation = "column";
        optGroup.alignChildren = "left";

        var pGrp = optGroup.add("group");
        pGrp.add("statictext", undefined, "Prefixo:");
        var prefix = pGrp.add("edittext", undefined, "");
        prefix.characters = 15;

        var sGrp = optGroup.add("group");
        sGrp.add("statictext", undefined, "Sufixo:");
        var sufix = sGrp.add("edittext", undefined, "");
        sufix.characters = 15;

        // (sem preview de nome aqui pois é lote)
        var vetorizar   = optGroup.add("checkbox", undefined, "Vetorizar todos os textos?");
        var semGrupos   = optGroup.add("checkbox", undefined, "Remover todos os grupos");
        var camadaUnica = optGroup.add("checkbox", undefined, "Mesclar tudo em uma camada só");

        var btns = w.add("group");
        btns.alignment = "center";
        var runBtn  = btns.add("button", undefined, "Exportar TODOS os PDFs");
        var closeBtn = btns.add("button", undefined, "Fechar");

        runBtn.onClick = function() {
            if (!pasta.text || !(new Folder(pasta.text)).exists) {
                alert("Escolha uma pasta válida!");
                return;
            }
            var files = getAiFiles(pasta.text);
            if (!files.length) {
                alert("Nenhum arquivo .ai encontrado.");
                return;
            }
            var ok=0, fail=0;
            for (var i=0; i<files.length; i++) {
                if ( exportAiToPDF(files[i],
                                   prefix.text, sufix.text,
                                   vetorizar.value, semGrupos.value, camadaUnica.value) )
                    ok++;
                else fail++;
            }
            Folder(pasta.text).execute();
            alert("Exportação concluída!\nSucesso: " + ok + "\nFalha: " + fail);
            w.close();
        };

        closeBtn.onClick = function() { w.close(); };
        w.show();
    }

    // ------------------- MAIN -------------------
    if (app.documents.length > 0) {
        singleFileUI(app.activeDocument);
    } else {
        batchUI();
    }

})();
