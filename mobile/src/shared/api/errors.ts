import axios from "axios";

type ApiErrorBody = {
    detail?: string | Array<{msg?:string}>;
}