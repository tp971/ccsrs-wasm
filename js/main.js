var program = null;

var process = null;
var process_str = null;
var transitions = [];
var weak_trace = false;
var do_random = false;

function status_info(text) {
    $("#status").html($("<span class='info'>").text(text));
}

function status_error(text) {
    $("#status").html($("<span class='error'>").text(text));
}

function explore_init(p) {
    if(p != program) {
        if(program != null)
            program.free();
        program = p;
    }
    $("#explore").removeClass("hidden");
    $("#explore_trace").children().each(function(i) {
        let from = $(this).data("from");
        if(from !== undefined)
            from.free();
    });
    $("#explore_trace").empty();
    explore_goto(p.get_process());
    explore_update_screen();
}

function explore_goto(p) {
    if(p != process) {
        if(process != null)
            process.free();
        process = p;
        process_str = process.to_string(program);
    }

    for(var i = 0; i < transitions.length; i++) {
        var next = transitions[i];
        next.act.free();
        if(next.sync !== null)
            next.sync.free();
        if(next.to != process)
            next.to.free();
    }
    transitions = [];

    try {
        var trans = process.get_transitions(program);
        var len = trans.len();
        for(var i = 0; i < len; i++) {
            var next = trans.get(i);
            transitions.push({
                act: next.get_action(),
                sync: next.is_sync() ? next.get_sync() : null,
                to: next.get_to()
            });
            next.free();
        }
        trans.free();
    } catch(err) {
        status_error(err);
    }
}

function explore_update_screen() {
    $("#explore_current")
        .text(process_str)
        .attr("title", process_str);

    $("#explore_select").empty();
    if(transitions.length == 0)
        $("#explore_select")
            .append($("<div class='none'>None</div>"));
    for(var i = 0; i < transitions.length; i++) {
        var next = transitions[i];
        var act_str = next.act.to_string(program);
        if(next.sync !== null) 
            act_str += " (" + next.sync.to_string(program) + ")";
        var to_str = next.to.to_string(program);

        $("#explore_select")
            .append($("<div>")
                .append($("<a href='#' class='act'>").text("--( " + act_str + " )->")
                    .data("index", i)
                    .click(function(e) {
                        e.preventDefault();
                        explore_select($(this).data("index"));
                        explore_update_screen();
                    })
                )
                .append("&nbsp;")
                .append($("<span class='to'>")
                    .text(to_str)
                    .attr("title", to_str)
                )
            );
    }

    var len = $("#explore_trace").children().length;
    if(len == 1)
        $("#explore_len").text("1 transition");
    else
        $("#explore_len").text(len + " transitions");
}

function explore_select(i) {
    var trans = transitions[i];

    if(!do_random || !weak_trace || !trans.act.is_internal()) {
        var act_str = trans.act.to_string(program);
        if(trans.sync !== null) 
            act_str += " (" + trans.sync.to_string(program) + ")";
        var from_str = process.to_string(program);

        var entry =
            $("<div>")
                .data("from", process.clone())
                .append($("<a href='#' class='act'>").text("<-( " + act_str + " )--")
                    .click(function(e) {
                        e.preventDefault();
                        let from = $(this).parent().data("from");
                        $(this).parent().prevAll().each(function(i) {
                            let from = $(this).data("from");
                            if(from !== undefined)
                                from.free();
                            $(this).remove();
                        });
                        $(this).parent().remove();
                        explore_goto(from);
                        explore_update_screen();
                    })
                )
                .append("&nbsp;")
                .append($("<span class='from'>")
                    .text(from_str)
                    .attr("title", from_str)
                );
        if(trans.act.is_internal())
            entry.addClass("weak");
        $("#explore_trace").prepend(entry);
    } else {
        $("#explore_trace").prepend($("<div>"));
    }

    explore_goto(transitions[i].to);
}

function explore_random() {
    if(do_random) {
        for(var i = 0; i < 16; i++) {
            if(transitions.length == 0)
                break;
            explore_select(Math.floor(Math.random() * transitions.length));
        }
        explore_update_screen();
        if(transitions.length > 0) {
            setTimeout(explore_random, 0);
        } else {
            explore_random_stop();
        }
    }
}

function explore_random_start() {
    $("#explore_transitions").addClass("hidden");
    $("#btn_random").addClass("hidden");
    $("#btn_random_stop").removeClass("hidden");
    do_random = true;
    explore_random();
}

function explore_random_stop() {
    $("#explore_transitions").removeClass("hidden");
    $("#btn_random").removeClass("hidden");
    $("#btn_random_stop").addClass("hidden");
    do_random = false;
}

$(document).ready(function() {
    delete WebAssembly.instantiateStreaming;
    // the `wasm_bindgen` global is set to the exports of the Rust module
    //
    // here we tell bindgen the path to the wasm file so it can run
    // initialization and return to us a promise when it's done
    // also, we can use 'await' on the returned promise
    wasm_bindgen('./wasm/ccsrs_wasm_bg.wasm').then(function() {
        //wasm_bindgen.program_from_string("");
        $("#btn_compile").click(function() {
            if(program !== null) {
                explore_random_stop();
            }
            try {
                var program = wasm_bindgen.parse_program($("#ccs_input").val());
                status_info("CCS compiled.");
                explore_init(program);
            } catch(err) {
                status_error(err);
            }
        });
        $("#btn_reset").click(function() {
            if(program != null) {
                explore_random_stop();
                explore_init(program);
            }
        });
        $("#btn_random").click(function() {
            if(program != null) {
                explore_random_start();
            }
        });
        $("#btn_random_stop").click(function() {
            if(program != null) {
                explore_random_stop();
            }
        });
        $("#cb_weak_trace").change(function() {
            weak_trace = this.checked;
            if(this.checked)
                $("#explore_trace").addClass("weak_trace");
            else
                $("#explore_trace").removeClass("weak_trace");
        });

        status_info("ready.");
    });
});
